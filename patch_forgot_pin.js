const fs = require('fs');
const path = 'src/screens/LoginScreen.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Add new state variables
code = code.replace(
  /const \[pinError, setPinError\] = useState\(''\);/,
  `const [pinError, setPinError] = useState('');
  
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailOtp, setEmailOtp] = useState('');`
);

// 2. Add handler for Email Submit
const emailSubmitHandler = `
  const handleEmailSubmit = async () => {
    Keyboard.dismiss();
    const emailRegex = /^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    // TODO: Call your backend API here to send the OTP to the email
    // await api.post('/send-email-otp', { email, phone });
    
    setTimeout(() => {
      setLoading(false);
      showToast('Verification code sent to your email!', 'success');
      setStep('EMAIL_OTP');
      fadeAnim.setValue(0);
    }, 1500);
  };
`;
code = code.replace(
  /const handleLoginSuccess = async \(\) => \{/,
  emailSubmitHandler + '\n\n  const handleLoginSuccess = async () => {'
);

// 3. Add handler logic for Email OTP inside handlePinChange
code = code.replace(
  /\} else if \(currentStep === 'ENTER_PIN'\) \{/,
  `} else if (currentStep === 'EMAIL_OTP') {
      setEmailOtp(cleaned);
      setPinError('');
      if (cleaned.length === 4) {
        // TODO: Call your backend API here to verify the OTP
        // const isValid = await api.post('/verify-email-otp', { email, otp: cleaned });
        
        // Mock verification: accept any 4 digit code for testing
        if (cleaned.length === 4) {
          showToast('Email verified! You can now set a new PIN.', 'success');
          setStep('CREATE_PIN');
          setPin('');
          setEmailOtp('');
          fadeAnim.setValue(0);
        } else {
          setPinError('Invalid verification code.');
          setEmailOtp('');
        }
      }
    } else if (currentStep === 'ENTER_PIN') {`
);

// 4. Update Header subtitle
code = code.replace(
  /\{step === 'CREATE_PIN' && 'Create a 4-digit PIN for quick access\.'\}/,
  `{step === 'CREATE_PIN' && 'Create a 4-digit PIN for quick access.'}
                {step === 'EMAIL_INPUT' && 'Enter your registered email to reset your PIN.'}
                {step === 'EMAIL_OTP' && \`Enter the 4-digit code sent to \${email}\`}`
);

// 5. Add EMAIL_INPUT form JSX
const emailInputJsx = `
            {step === 'EMAIL_INPUT' && (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={20} color="#94A3B8" />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={(val) => {
                        setEmail(val);
                        setEmailError('');
                      }}
                    />
                  </View>
                  {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                </View>

                <TouchableOpacity style={[styles.loginBtn, loading && styles.loginBtnDisabled]} onPress={handleEmailSubmit} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Text style={styles.loginBtnText}>Send Code</Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.linkBtn} onPress={() => { setStep('ENTER_PIN'); }}>
                  <Text style={styles.linkText}>Back to PIN</Text>
                </TouchableOpacity>
              </View>
            )}
`;
code = code.replace(
  /\{\(step === 'CREATE_PIN' \|\| step === 'CONFIRM_PIN' \|\| step === 'ENTER_PIN'\) && \(/,
  emailInputJsx + "\n\n            {(step === 'CREATE_PIN' || step === 'CONFIRM_PIN' || step === 'ENTER_PIN' || step === 'EMAIL_OTP') && ("
);

// 6. Update renderPinDots usage
code = code.replace(
  /\{renderPinDots\(step === 'CONFIRM_PIN' \? confirmPin : pin\)\}/,
  "{renderPinDots(step === 'CONFIRM_PIN' ? confirmPin : step === 'EMAIL_OTP' ? emailOtp : pin)}"
);

code = code.replace(
  /value=\{step === 'CONFIRM_PIN' \? confirmPin : pin\}/,
  "value={step === 'CONFIRM_PIN' ? confirmPin : step === 'EMAIL_OTP' ? emailOtp : pin}"
);

// 7. Update Forgot PIN button click
code = code.replace(
  /showToast\('PIN reset flow would trigger here\. We will integrate Google Email reset soon!', 'info'\);/,
  "setStep('EMAIL_INPUT'); fadeAnim.setValue(0);"
);

fs.writeFileSync(path, code);
