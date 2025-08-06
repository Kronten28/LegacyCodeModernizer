import os
import sys
import subprocess
from openai import OpenAI, OpenAIError
import tempfile
import json
import re
import uuid
from api_save import fetch_api_key

# Ensure UTF-8 encoding for subprocess calls
os.environ['PYTHONIOENCODING'] = 'utf-8'


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


def extract_line_number(code: str, flagged_code: str) -> int:
    """Extract the line number where the flagged code appears."""
    lines = code.split('\n')
    for i, line in enumerate(lines, 1):
        if flagged_code.strip() in line:
            return i
    return 1  # Default to line 1 if not found


def ai_security_check(code: str, filename: str = "code.py") -> list:
    """
    Perform AI-powered security analysis on Python code.
    Returns a list of security issues in the required format.
    """
    system_prompt = """
You are a security auditing assistant integrated into a desktop application called *Legacy Code Modernizer*.
Your task is to analyze Python source code and identify any *security vulnerabilities, bad practices, or compliance risks*, then classify them and suggest improvements.

### Requirements
Please scan the provided Python code and return a list of all identified issues, using the structured output format below.
For *each issue*, include the following fields:
- *risk_level*: One of "high", "medium", or "low" (lowercase)
- *issue_title*: A 2-4 word summary of the issue (e.g., "Unvalidated Input", "SQL Injection Risk")
- *description*: One sentence describing the issue and why it matters
- *flagged_code*: The exact line(s) or snippet that triggered the issue
- *recommended_code*: The corrected/secure version of the flagged_code that should replace it
- *suggested_fix*: A clear recommendation for modern, secure Python (v3) code
- *compliance_category*: Must be exactly one of: "HIPAA", "ISO27001", or "General"

### What to Look For

#### General Security Issues
- Use of insecure functions (eval, exec, input() in Python 2)
- Missing input validation or sanitation
- Hardcoded secrets, passwords, or API keys
- Unsecured file or network access
- Use of deprecated or outdated libraries
- Weak exception handling that exposes internals
- Logging sensitive information without safeguards
- Poor cryptographic practices or key management
- SQL injection vulnerabilities
- Command injection risks
- Path traversal vulnerabilities
- Insecure random number generation
- Missing authentication or authorization checks

#### HIPAA-Specific Risks
- Exposure of PHI (e.g., names, health records, account IDs)
- Logging PHI or storing it unencrypted
- Lack of access control or audit logs for sensitive data
- Missing encryption for storage or transmission of health data
- Insufficient data retention policies
- Missing data integrity checks

#### ISO 27001-Specific Risks
- Hardcoded secrets (violates control A.9.2, A.10.1)
- No traceability or audit logging (A.12.4)
- Use of insecure libraries without validation
- Lack of authentication or access control
- Poor separation of concerns or privilege escalation risks
- Missing input validation (A.14.2)
- Weak cryptography (A.10.1)
- No error handling strategy (A.12.1)

### Output Format (return in JSON)
Return ONLY a valid JSON array. Do not include any markdown formatting or additional text.
[
  {
    "risk_level": "high",
    "issue_title": "Hardcoded Password",
    "description": "The script contains a hardcoded password, which poses a serious risk if committed or shared.",
    "flagged_code": "password = 'mysecret123'",
    "recommended_code": "password = os.getenv('PASSWORD')",
    "suggested_fix": "Store the password in an environment variable or a secure secrets manager.",
    "compliance_category": "ISO27001"
  }
]

### Guidelines
- If no issues are found, return an *empty array*: []
- Analyze *both syntax and semantic meaning* of the code
- Return *specific, actionable recommendations*
- Focus on real security issues, not style preferences
- Be thorough but avoid false positives
"""

    try:
        client = get_openai_client()
        resp = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Analyze this Python code for security issues:\n\n{code}"},
            ],
            temperature=0,
        )
        content = resp.choices[0].message.content
        
        # Parse the JSON response
        try:
            # Clean up the response if it contains markdown code blocks
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            issues = json.loads(content)
            
            # Transform the AI response to match our SecurityIssue interface
            security_issues = []
            for issue in issues:
                # Map risk_level to severity
                severity_map = {
                    "high": "high",
                    "medium": "medium", 
                    "low": "low"
                }
                
                # Map compliance_category to standard
                standard_map = {
                    "HIPAA": "HIPAA",
                    "ISO27001": "ISO27001",
                    "General": "General",
                    "ISO 27001": "ISO27001",  # Handle variations
                    "General Security Issue": "General"
                }
                
                security_issue = {
                    "id": str(uuid.uuid4()),
                    "file": filename,
                    "line": extract_line_number(code, issue.get("flagged_code", "")),
                    "severity": severity_map.get(issue.get("risk_level", "low"), "low"),
                    "standard": standard_map.get(issue.get("compliance_category", "General"), "General"),
                    "title": issue.get("issue_title", "Security Issue"),
                    "description": issue.get("description", ""),
                    "recommendation": issue.get("suggested_fix", ""),
                    "code": issue.get("flagged_code", ""),
                    "recommended_code": issue.get("recommended_code", "")
                }
                security_issues.append(security_issue)
            
            return security_issues
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse AI response as JSON: {e}")
            print(f"Response was: {content}")
            return []
            
    except OpenAIError as e:
        print(f"OpenAI request failed: {e}")
        return []
    except Exception as e:
        print(f"Unexpected error in security check: {e}")
        return []


def ai_check(code: str) -> str:
    """Legacy function for compatibility - returns raw JSON string."""
    issues = ai_security_check(code)
    return json.dumps(issues, indent=2)


def main():
    test_code = """
import mysql.connector
import os

# Database connection with hardcoded password
db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="admin123",  # Hardcoded password
    database="patients"
)

def get_patient_data(patient_id):
    cursor = db.cursor()
    # SQL injection vulnerability
    query = f"SELECT * FROM patients WHERE id = {patient_id}"
    cursor.execute(query)
    return cursor.fetchall()

def save_patient_file(content, filename):
    # Path traversal vulnerability
    with open(f"/var/medical_records/{filename}", "w") as f:
        f.write(content)

def log_access(user_id, patient_data):
    # Logging sensitive data
    print(f"User {user_id} accessed patient data: {patient_data}")

def generate_session_id():
    # Weak random number generation
    import random
    return random.randint(1000, 9999)

# Using eval - dangerous
user_input = input("Enter calculation: ")
result = eval(user_input)
print(result)
"""
    
    issues = ai_security_check(test_code, "test.py")
    print(json.dumps(issues, indent=2))


if __name__ == "__main__":
    main()