# Security Guidelines for Python Backend

## 🚨 Critical Security Fix Applied

**The original `init_db.py` contained hardcoded credentials which posed a severe security risk. This has been fixed.**

## Security Improvements Made

### 1. **Environment-Based Credentials**
- Removed hardcoded passwords from source code
- All credentials now come from environment variables
- Secure password generation when env vars not set

### 2. **Secure Password Generation**
- Automatic generation of 16-character secure passwords
- Uses cryptographically secure random generator
- Includes letters, numbers, and special characters

### 3. **Security Warnings**
- Clear warnings when running without secure passwords
- Prompts to save generated passwords immediately
- Production environment recommendations

## Required Environment Variables

### **Critical Security Variables**
```bash
ADMIN_EMAIL=admin@your-domain.com
ADMIN_PASSWORD=your_very_secure_admin_password_here
DEFAULT_USER_EMAIL=user@your-domain.com  
DEFAULT_USER_PASSWORD=your_secure_user_password_here
```

### **API Keys**
```bash
GEMINI_API_KEY_POOL=key1,key2,key3
OPENROUTER_API_KEY=your_openrouter_api_key_here
SECRET_KEY=your_jwt_secret_key_here
```

## Setup Instructions

### 1. **Copy Environment Template**
```bash
cp env.example .env
```

### 2. **Generate Secure Passwords**
```bash
# Generate strong passwords (Linux/Mac)
openssl rand -base64 32

# Or use Python
python -c "import secrets, string; print(''.join(secrets.choice(string.ascii_letters + string.digits + '!@#$%^&*') for _ in range(16)))"
```

### 3. **Set Environment Variables**
```bash
# Edit .env file with your secure values
nano .env
```

### 4. **Initialize Database Securely**
```bash
# Set environment variables first
export ADMIN_PASSWORD="your_secure_password"
export DEFAULT_USER_PASSWORD="another_secure_password"

# Then run initialization
python -m app.utils.init_db
```

## Security Best Practices

### **Password Requirements**
- Minimum 12 characters
- Include uppercase, lowercase, numbers, and symbols
- Use unique passwords for each account
- Never reuse production passwords

### **Environment Variables**
- Never commit `.env` files to version control
- Use different passwords for dev/staging/production
- Rotate passwords regularly
- Use secrets management in production

### **Production Deployment**
- Use proper secrets management (AWS Secrets Manager, Azure Key Vault, etc.)
- Enable HTTPS/TLS
- Use strong JWT secret keys
- Implement rate limiting
- Regular security audits

## Migration from Old System

If you have existing systems with the old hardcoded credentials:

### **Immediate Actions Required:**

1. **Change Default Passwords**
   ```bash
   # If you were using the old hardcoded passwords
   # - Admin: "Christlurker2" 
   # - User: "user123"
   # Change them immediately!
   ```

2. **Update Environment Variables**
   ```bash
   # Set new secure passwords
   export ADMIN_PASSWORD="new_secure_admin_password"
   export DEFAULT_USER_PASSWORD="new_secure_user_password"
   ```

3. **Rotate API Keys**
   ```bash
   # Generate new API keys and update
   export GEMINI_API_KEY_POOL="new_key1,new_key2,new_key3"
   export SECRET_KEY="new_jwt_secret"
   ```

## Security Checklist

- [ ] Removed hardcoded credentials from code
- [ ] Set secure environment variables
- [ ] Generated strong passwords (16+ characters)
- [ ] Updated API keys
- [ ] Configured HTTPS for production
- [ ] Set up proper secrets management
- [ ] Implemented regular password rotation
- [ ] Added security monitoring

## Emergency Response

### **If Credentials Were Compromised:**

1. **Immediate Actions**
   - Change all passwords immediately
   - Rotate all API keys
   - Review access logs
   - Check for unauthorized access

2. **Investigation**
   - Audit all database access
   - Review user activities
   - Check for data exfiltration

3. **Prevention**
   - Implement additional security measures
   - Enable 2FA where possible
   - Add security monitoring
   - Regular security assessments

## Contact

For security concerns or to report vulnerabilities:
- Create an issue with "SECURITY" label
- Contact system administrators immediately
- Follow responsible disclosure practices

---

**Remember: Security is everyone's responsibility. Always follow secure coding practices and never hardcode credentials!** 