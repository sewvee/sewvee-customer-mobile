                        const cleaned = val.replace(/[^0-9]/g, '');
                        setPhone(cleaned);
                        if (cleaned.length > 0 && cleaned[0] < '6') setPhoneError('Invalid mobile number');
                        else setPhoneError('');
                      }}
                    />
                  </View>
                  {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
                </View>

                <TouchableOpacity style={[styles.loginBtn, loading && styles.loginBtnDisabled]} onPress={handlePhoneSubmit} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Text style={styles.loginBtnText}>Continue</Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            
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


            {(step === 'CREATE_PIN' || step === 'CONFIRM_PIN' || step === 'ENTER_PIN' || step === 'EMAIL_OTP') && (
              <View style={styles.form}>
                <View style={styles.pinWrapper}>
                  {renderPinDots(step === 'CONFIRM_PIN' ? confirmPin : step === 'EMAIL_OTP' ? emailOtp : pin)}
                  <TextInput
                    style={styles.hiddenPinInput}
                    keyboardType="number-pad"
                    maxLength={4}
                    autoFocus={true}
                    value={step === 'CONFIRM_PIN' ? confirmPin : step === 'EMAIL_OTP' ? emailOtp : pin}
                    onChangeText={(val) => handlePinChange(val, step)}
                  />
                </View>

                {pinError ? <Text style={[styles.errorText, {textAlign: 'center', marginBottom: 20}]}>{pinError}</Text> : null}

                {loading && <ActivityIndicator color="#6366F1" size="large" style={{ marginTop: 20 }} />}
                
                <TouchableOpacity style={styles.linkBtn} onPress={() => { setStep('PHONE_INPUT'); setPin(''); setConfirmPin(''); }}>
                  <Text style={styles.linkText}>Change Phone Number</Text>
                </TouchableOpacity>

                {step === 'ENTER_PIN' && (
                  <TouchableOpacity style={styles.linkBtn} onPress={() => {
                    // Reset PIN flow via OTP could go here. For now just reset it.
                    setStep('EMAIL_INPUT'); fadeAnim.setValue(0);
                  }}>
                    <Text style={styles.linkText}>Forgot PIN?</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

          </Animated.View>
        </KeyboardAwareScrollView>
      </View>
    </ImageBackground>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Darker overlay to make glass pop
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: {
    color: '#FFF',
    fontSize: 32,
    fontFamily: 'Inter-Bold',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
    lineHeight: 20,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#334155',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 60,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1E293B',
    fontFamily: 'Inter-SemiBold',
  },
  loginBtn: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'Inter-Bold',
    marginRight: 8,
  },
  errorText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    marginLeft: 4,
  },
  pinWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  pinDotsContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  hiddenPinInput: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: '100%',
  },
  linkBtn: {
    alignItems: 'center',
    marginTop: 16,
  },
  linkText: {
    color: Colors.primary,
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  }
});
