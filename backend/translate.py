import os
import sys
import subprocess
import json
from openai import OpenAI, OpenAIError
import tempfile
from security_check import ai_security_check

# Ensure UTF-8 encoding for subprocess calls
os.environ['PYTHONIOENCODING'] = 'utf-8'


def fetch_api_key(provider: str) -> str:
    cmd = ["./api_manager/target/release/api_manager.exe", "-g", provider]
    try:
        # Use utf-8 encoding and handle errors gracefully
        result = subprocess.run(
            cmd, 
            capture_output=True, 
            text=True, 
            encoding='utf-8', 
            errors='replace',  # Replace invalid characters instead of failing
            check=True
        )
    except subprocess.CalledProcessError as e:
        stderr = e.stderr or ""
        raise RuntimeError(
            f"Fail to run api_manager, provider={provider}, stderr: {stderr}"
        ) from e

    try:
        # The stdout should now be properly decoded UTF-8
        data = json.loads(result.stdout)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"api_manager return incorrect json format: {result.stdout}, error: {str(e)}")
    
    if data.get("provider") == provider and data.get("status") == "success":
        key = data.get("key")
        if key and key.strip():  # Check for non-empty key
            return key
        else:
            return ""  # Return empty string if no key found

    raise RuntimeError(
        f"Failed to fetch API key for {provider}, output: {result.stdout}"
    )


MODEL_NAME = "gpt-4.1"

def get_openai_client():
    """Get OpenAI client instance, creating it lazily when needed."""
    try:
        api_key = fetch_api_key("openai")
        if not api_key:
            raise RuntimeError("No OpenAI API key configured")
        return OpenAI(api_key=api_key)
    except Exception as e:
        raise RuntimeError(f"Failed to initialize OpenAI client: {str(e)}")


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
        client = get_openai_client()
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
    
    # Validate that the code is not empty
    if not code.strip():
        raise ValueError("Input code is empty")
    
    # Ensure code ends with newline (required by lib2to3)
    if not code.endswith('\n'):
        code += '\n'
    
    fixer_pkg = "lib2to3.fixes"
    tool = RefactoringTool(get_fixers_from_package(fixer_pkg))
    
    try:
        tree = tool.refactor_string(code, src_path)
        if tree is None:
            raise ValueError("lib2to3 failed to parse the code - it may contain syntax errors")
    except Exception as e:
        raise ValueError(f"lib2to3 parsing error: {str(e)}")
    
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


def migrate_code_str(code_str, filename="code.py"):
    with tempfile.TemporaryDirectory() as tmpdir:
        src_path = os.path.join(tmpdir, "src.py")
        dst_path = os.path.join(tmpdir, "dst.py")
        
        try:
            # Validate that the code is not empty
            if not code_str.strip():
                raise ValueError("Input code is empty")
            
            # Handle encoding issues - ensure code_str is properly encoded
            try:
                # Try to encode and decode to ensure it's valid UTF-8
                code_str.encode('utf-8').decode('utf-8')
            except UnicodeEncodeError as e:
                raise ValueError(f"Input contains invalid characters that cannot be encoded: {str(e)}")
            except UnicodeDecodeError as e:
                raise ValueError(f"Input encoding error: {str(e)}")
            
            # Ensure code ends with newline (required by lib2to3)
            if not code_str.endswith('\n'):
                code_str += '\n'
            
            with open(src_path, "w", encoding="utf-8") as f:
                f.write(code_str)
            
            # Add error handling for lib2to3 parsing
            try:
                run_2to3(src_path, dst_path)
            except Exception as e:
                raise RuntimeError(f"Failed to parse Python 2 code with lib2to3: {str(e)}")
            
            code3 = read_code(dst_path)
            code3_improved, explanation = ai_migrate(code3)
            security_issues = ai_security_check(code3_improved, filename)

            return code3_improved, explanation, security_issues
        except Exception as e:
            raise RuntimeError(f"Migration failed: {str(e)}")


def main():
    src = sys.argv[1]
    if os.path.isfile(src):
        res = migrate_code_str(read_code(src))
        #print(f"Code: \n{res[0]}\nExplain: {res[1]}\nSecurity Issues: {res[2]}")


if __name__ == "__main__":
    main()
