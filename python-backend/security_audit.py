#!/usr/bin/env python3
"""
Security audit script to check for common security issues
"""

import os
import re
import glob
from pathlib import Path

def check_hardcoded_secrets():
    """Check for hardcoded secrets in Python files"""
    print("🔍 Checking for hardcoded secrets...")
    
    secret_patterns = [
        (r'password\s*=\s*["\'][^"\']+["\']', 'Hardcoded password'),
        (r'api_key\s*=\s*["\'][^"\']+["\']', 'Hardcoded API key'),
        (r'secret\s*=\s*["\'][^"\']+["\']', 'Hardcoded secret'),
        (r'token\s*=\s*["\'][^"\']+["\']', 'Hardcoded token'),
        (r'["\'][A-Za-z0-9]{32,}["\']', 'Potential hardcoded key/token'),
    ]
    
    issues = []
    
    for py_file in glob.glob("**/*.py", recursive=True):
        if 'security_audit.py' in py_file:
            continue
        # Skip virtual environment and external packages
        if any(skip in py_file for skip in ['python_env/', 'venv/', 'env/', 'site-packages/']):
            continue
            
        try:
            with open(py_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
            for pattern, description in secret_patterns:
                matches = re.finditer(pattern, content, re.IGNORECASE)
                for match in matches:
                    line_num = content[:match.start()].count('\n') + 1
                    issues.append({
                        'file': py_file,
                        'line': line_num,
                        'issue': description,
                        'content': match.group().strip()
                    })
        except Exception as e:
            print(f"⚠️  Error reading {py_file}: {e}")
    
    if issues:
        print("🚨 POTENTIAL SECURITY ISSUES FOUND:")
        for issue in issues:
            print(f"  📁 {issue['file']}:{issue['line']}")
            print(f"     ⚠️  {issue['issue']}")
            print(f"     🔍 {issue['content']}")
            print()
    else:
        print("✅ No obvious hardcoded secrets found")
    
    return issues

def check_env_files():
    """Check for .env files that might be committed"""
    print("\n🔍 Checking for environment files...")
    
    env_files = []
    for pattern in ['.env', '.env.*', '*.env']:
        env_files.extend(glob.glob(pattern, recursive=True))
    
    if env_files:
        print("⚠️  Environment files found:")
        for env_file in env_files:
            print(f"  📄 {env_file}")
            if env_file == '.env':
                print("     🚨 This should NOT be committed to version control!")
        print("💡 Tip: Add .env to .gitignore")
    else:
        print("✅ No .env files found in root")

def check_gitignore():
    """Check if .gitignore properly excludes sensitive files"""
    print("\n🔍 Checking .gitignore configuration...")
    
    gitignore_path = '.gitignore'
    sensitive_patterns = ['.env', '*.env', '.env.*', '__pycache__', '*.pyc']
    
    if not os.path.exists(gitignore_path):
        print("🚨 No .gitignore file found!")
        print("💡 Create .gitignore to exclude sensitive files")
        return
    
    with open(gitignore_path, 'r') as f:
        gitignore_content = f.read()
    
    missing_patterns = []
    for pattern in sensitive_patterns:
        if pattern not in gitignore_content:
            missing_patterns.append(pattern)
    
    if missing_patterns:
        print("⚠️  Missing patterns in .gitignore:")
        for pattern in missing_patterns:
            print(f"  📝 {pattern}")
    else:
        print("✅ .gitignore looks good")

def check_environment_variables():
    """Check if critical environment variables are set"""
    print("\n🔍 Checking environment variables...")
    
    critical_vars = [
        'ADMIN_PASSWORD',
        'DEFAULT_USER_PASSWORD', 
        'SECRET_KEY',
        'GEMINI_API_KEY_POOL'
    ]
    
    missing_vars = []
    for var in critical_vars:
        if not os.environ.get(var):
            missing_vars.append(var)
    
    if missing_vars:
        print("⚠️  Missing environment variables:")
        for var in missing_vars:
            print(f"  🔧 {var}")
        print("💡 Set these in your .env file or environment")
    else:
        print("✅ All critical environment variables are set")

def check_file_permissions():
    """Check file permissions for sensitive files"""
    print("\n🔍 Checking file permissions...")
    
    sensitive_files = ['.env', 'env.example']
    
    for file_path in sensitive_files:
        if os.path.exists(file_path):
            stat = os.stat(file_path)
            mode = stat.st_mode & 0o777
            
            if mode & 0o044:  # World/group readable
                print(f"⚠️  {file_path} is readable by others (mode: {oct(mode)})")
                print("💡 Consider: chmod 600 .env")
            else:
                print(f"✅ {file_path} has good permissions")

def generate_security_report():
    """Generate a comprehensive security report"""
    print("=" * 60)
    print("🛡️  SECURITY AUDIT REPORT")
    print("=" * 60)
    
    # Run all checks
    secret_issues = check_hardcoded_secrets()
    check_env_files()
    check_gitignore()
    check_environment_variables()
    check_file_permissions()
    
    print("\n" + "=" * 60)
    print("📋 SUMMARY")
    print("=" * 60)
    
    if secret_issues:
        print(f"🚨 {len(secret_issues)} potential security issues found")
        print("❗ Review and fix hardcoded secrets immediately")
    else:
        print("✅ No obvious security issues found")
    
    print("\n🔒 SECURITY RECOMMENDATIONS:")
    print("  • Use environment variables for all secrets")
    print("  • Never commit .env files")
    print("  • Use strong, unique passwords")
    print("  • Enable 2FA where possible")
    print("  • Regular security audits")
    print("  • Implement proper secrets management in production")

if __name__ == "__main__":
    generate_security_report() 