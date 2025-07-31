import os
import sys
import subprocess
import json
from openai import OpenAI, OpenAIError
import tempfile


def fetch_api_key(provider: str) -> str:
    cmd = ["./api_manager/target/release/api_manager", "-g", provider]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    except subprocess.CalledProcessError as e:
        stderr = e.stderr or ""
        raise RuntimeError(
            f"Fail to run api_manager, provider={provider}, stderr: {stderr}"
        ) from e

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        raise RuntimeError(f"api_manager return incorrect json format: {result.stdout}")
    if data.get("provider") == provider and data.get("status") == "success":
        key = data.get("key")
        if key:
            return key

    raise RuntimeError(
        f"didn't provider={provider} 且 status=success 的 key, output: {result.stdout}"
    )


client = OpenAI(api_key=fetch_api_key("openai"))
MODEL_NAME = "gpt-4.1"


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
        "Respond ONLY with the raw Python code, without any markdown formatting or triple backticks.\n\n"
        f"{code}"
    )
    try:
        resp = (
            client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0,
            )
            .choices[0]
            .message.content
        )
    except OpenAIError as e:
        raise RuntimeError(f"OpenAI request failed: {e}") from e
    compare_prompt = (
        "Here are two versions of code. The first is Python 2 and the second is the modernized Python 3 version. "
        "Provide a bullet-point list explaining what changed.\n"
        f"Python2 Code:\n{code}\nPython3 Code:\n{resp}"
    )
    try:
        compare = (
            client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": compare_prompt},
                ],
                temperature=0.2,
            )
            .choices[0]
            .message.content
        )
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
