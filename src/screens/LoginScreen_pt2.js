      }
    } catch (err) {
      console.log('Error fetching live customer info for login', err);
    }

    const customerProfile = {
      id: customerId,
      name: customerName,
      mobile: phone,
      role: 'Customer',
      lastLogin: new Date().toISOString(),
    };
    await saveUser(customerProfile);
    await login('customer_demo_token', true);
    setLoading(false);
    showToast('Welcome back, ' + customerName + '!', 'success');
    navigation.navigate('Main');
  };

  const handlePinChange = async (val, currentStep) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    if (currentStep === 'CREATE_PIN') {
      setPin(cleaned);
      if (cleaned.length === 4) {
        setTimeout(() => {
          setStep('CONFIRM_PIN');
          fadeAnim.setValue(0);
        }, 300);
      }
    } else if (currentStep === 'CONFIRM_PIN') {
      setConfirmPin(cleaned);
      setPinError('');
      if (cleaned.length === 4) {
        if (cleaned === pin) {
          // Success! Save PIN
          await AsyncStorage.setItem(`@sewvee_pin_${phone}`, pin);
          handleLoginSuccess();
        } else {
          setPinError('PINs do not match. Try again.');
          setConfirmPin('');
          setStep('CREATE_PIN');
          setPin('');
          fadeAnim.setValue(0);
          showToast('PINs do not match', 'error');
        }
      }
    } else if (currentStep === 'EMAIL_OTP') {
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
    } else if (currentStep === 'ENTER_PIN') {
      setPin(cleaned);
      setPinError('');
      if (cleaned.length === 4) {
        if (cleaned === storedPin) {
          handleLoginSuccess();
        } else {
          setPinError('Incorrect PIN. Please try again.');
          setPin('');
        }
      }
    }
  };

  const renderPinDots = (value) => {
    return (
      <View style={styles.pinDotsContainer}>
        {[1, 2, 3, 4].map((item, index) => (
          <View key={index} style={[styles.pinDot, value.length > index && styles.pinDotFilled]} />
        ))}
      </View>
    );
  };

  return (
    <ImageBackground source={{ uri: BG_IMAGE_URL }} style={styles.container} blurRadius={Platform.OS === 'ios' ? 8 : 4}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.overlay}>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          extraScrollHeight={20}
        >
          <Animated.View style={[styles.glassCard, { opacity: fadeAnim }]}>
            
            <View style={styles.header}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoText}>S</Text>
              </View>
              <Text style={styles.title}>Sewvee</Text>
              <Text style={styles.subtitle}>
                {step === 'PHONE_INPUT' && 'Enter your phone number to access your boutique orders and designs.'}
                {step === 'CREATE_PIN' && 'Create a 4-digit PIN for quick access.'}
                {step === 'EMAIL_INPUT' && 'Enter your registered email to reset your PIN.'}
                {step === 'EMAIL_OTP' && `Enter the 4-digit code sent to ${email}`}
                {step === 'CONFIRM_PIN' && 'Confirm your 4-digit PIN.'}
                {step === 'ENTER_PIN' && `Welcome back! Enter your PIN for ${phone}`}
              </Text>
            </View>

            {step === 'PHONE_INPUT' && (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone Number</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="call-outline" size={20} color="#94A3B8" />
                    <TextInput
                      style={styles.input}
                      placeholder="10 Digit Mobile Number"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      maxLength={10}
                      value={phone}
                      onChangeText={(val) => {
