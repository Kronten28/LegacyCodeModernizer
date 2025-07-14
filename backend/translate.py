import os
import sys
import subprocess
from openai import OpenAI
from dotenv import load_dotenv
import tempfile

load_dotenv()
OpenAI.api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI()


def read_code(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def write_tmp(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def ai_migrate(code):
    prompt = (
        "You are an agent - please keep going until the user's query is completely resolved, before ending your turn and yielding back to the user. Only terminate your turn when you are sure that the problem is solved.\n\n"
        "If you are not sure about file content or codebase structure pertaining to the user's request, use your tools to read files and gather the relevant information: do NOT guess or make up an answer.\n\n"
        "Below is Python 3 code that was translated from Python 2 using 2to3. Label all the variable's type explicitly and add type annotations to all functions and variables. Also, remove any unnecessary comments or whitespace or unused imports.\n\n"
        "Please improve the code to make it more idiomatic and robust in Python 3, but only output the code with nothing else. Remember to remove ``` at the beginning and the end\n\n"
        "If any comments are added to explain key changes, include them inline.\n\n"
        f"{code}"
    )
    resp = client.responses.create(
        model="gpt-4.1",
        input=prompt,
    ).output_text
    prompt = (
        "You are a professional Python code modernizer. Here are two versions of code, one is based on Python2 and another is based on Python3. Your task is compare the two versions of codes and make a bullet-point list explaining what was changed\n"
        f"Python2 Code: {code}, Python3 Code: {resp}\n"
        "If you are not sure about file content or codebase structure pertaining to the user's request, use your tools to read files and gather the relevant information: do NOT guess or make up an answer.\n" 
        "Remove any unnecessary content in response and output with plain text format\n"
    )
    compare = client.responses.create(
        model="gpt-4.1",
        input=prompt,
    ).output_text
    return (resp, compare)


def write_tmp(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


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


def migrate_dir(src_dir, dst_dir):
    os.makedirs(dst_dir, exist_ok=True)
    for fname in os.listdir(src_dir):
        if not fname.endswith(".py"):
            continue
        migrate_file(
            os.path.join(src_dir, fname),
            os.path.join(dst_dir, fname),
        )


def migrate_code_str(code_str):
    with tempfile.TemporaryDirectory() as tmpdir:
        src_path = os.path.join(tmpdir, "src.py")
        dst_path = os.path.join(tmpdir, "dst.py")
        with open(src_path, "w", encoding="utf-8") as f:
            f.write(code_str)
        run_2to3(src_path, dst_path)
        code3 = read_code(dst_path)
        code3_improved = ai_migrate(code3)
        return code3_improved

def main():
    src = sys.argv[1]
    if os.path.isfile(src):
        res = migrate_code_str(read_code(src))
        print(f"Code: \n{res[0]}\nExplain: {res[1]}")


if __name__ == "__main__":
    main()
