import os
import sys
import subprocess
from openai import OpenAI, OpenAIError
from dotenv import load_dotenv
import tempfile

load_dotenv()
OpenAI.api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI()

MODEL_NAME = os.getenv("OPENAI_MODEL_NAME", "gpt-4.1")

def read_code(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def write_tmp(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def ai_migrate(code):
    system_prompt = (
        "You modernize Python 2 code into idiomatic Python 3 with type hints."
    )
    user_prompt = (
        "Below is Python 3 code translated from Python 2 using 2to3. "
        "Label all variable types explicitly and add type annotations to all functions and variables. "
        "Remove unnecessary comments, whitespace and unused imports. "
        "Improve the code to make it idiomatic and robust in Python 3. "
        "Respond only with the improved code in a Python code block.\n\n"
        f"{code}"
    )
    try:
        resp = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0,
        ).choices[0].message.content
    except OpenAIError as e:
        raise RuntimeError(f"OpenAI request failed: {e}") from e
    compare_prompt = (
        "Here are two versions of code. The first is Python 2 and the second is the modernized Python 3 version. "
        "Provide a bullet-point list explaining what changed.\n"
        f"Python2 Code:\n{code}\nPython3 Code:\n{resp}"
    )
    try:
        compare = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": compare_prompt},
            ],
            temperature=0.2,
        ).choices[0].message.content
    except OpenAIError as e:
        raise RuntimeError(f"OpenAI request failed: {e}") from e
    return (resp, compare)

from lib2to3.refactor import RefactoringTool, get_fixers_from_package

def run_2to3(src_path, dst_path):
    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
    with open(src_path, "r", encoding="utf-8") as src_file:
        code = src_file.read()
    fixer_pkg = "lib2to3.fixes"
    tool = RefactoringTool(get_fixers_from_package(fixer_pkg))
    tree = tool.refactor_string(code, src_path)
    with open(dst_path, "w", encoding="utf-8") as dst_file:
        dst_file.write(str(tree))


def migrate_file(src_path, dst_path):
    run_2to3(src_path, dst_path)
    code3 = read_code(dst_path)
    code3_improved = ai_migrate(code3)[0]
    write_tmp(dst_path, code3_improved)