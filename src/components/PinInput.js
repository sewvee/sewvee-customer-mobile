import React, { useRef, useState } from 'react';
import {
    View,
    TextInput,
    StyleSheet,
    Platform
} from 'react-native';
import { Colors, Shadow } from '../constants/theme';

const PinInput = ({ value, onValueChange, length = 4 }) => {
    const inputs = useRef([]);
    const [focusedIndex, setFocusedIndex] = useState(null);

    const handleTextChange = (text, index) => {
        // Only allow numbers
        const cleanText = text.replace(/[^0-9]/g, '');

        // Handle Paste (multiple digits at once)
        if (cleanText.length > 1) {
            const pastedText = cleanText.slice(0, length);
            onValueChange(pastedText);
            // Focus the last filled box or the next one
            const nextIndex = Math.min(pastedText.length, length - 1);
            inputs.current[nextIndex]?.focus();
            return;
        }

        // Handle single digit input
        const char = cleanText.slice(-1);
        const pinArray = value.split('');
        
        // Ensure array is at least as long as current index
        while (pinArray.length < length) pinArray.push('');
        
        pinArray[index] = char;
        const result = pinArray.join('').slice(0, length);
        onValueChange(result);

        // Move to next box if we entered a digit
        if (char && index < length - 1) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace') {
            // If current box is empty, move back to previous box
            if (!value[index] && index > 0) {
                inputs.current[index - 1]?.focus();
            }
        }
    };

    // Prevent user from clicking ahead into empty boxes
    const handleFocus = (index) => {
        const firstEmptyIndex = value.length;
        if (index > firstEmptyIndex && firstEmptyIndex < length) {
            inputs.current[firstEmptyIndex]?.focus();
            setFocusedIndex(firstEmptyIndex);
        } else {
            setFocusedIndex(index);
        }
    };

    return (
        <View style={styles.container}>
            {[...Array(length)].map((_, i) => (
                <View key={i} style={[
                    styles.box,
                    value[i] ? styles.boxActive : null,
                    // Highlight ONLY if it is the currently focused box
                    (focusedIndex === i) ? styles.boxCurrent : null
                ]}>
                    <TextInput
                        ref={(ref) => { if (ref) inputs.current[i] = ref; }}
                        style={styles.input}
                        maxLength={1}
                        keyboardType="number-pad"
                        onChangeText={(text) => handleTextChange(text, i)}
                        onKeyPress={(e) => handleKeyPress(e, i)}
                        onFocus={() => handleFocus(i)}
                        onBlur={() => setFocusedIndex(null)}
                        value={value[i] || ''}
                        secureTextEntry={true}
                        selectTextOnFocus={true}
                        cursorColor={Colors.primary}
                        autoComplete="one-time-code"
                        textContentType="oneTimeCode"
                    />
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 8,
    },
    box: {
        flex: 1,
        maxWidth: 72,
        height: 56,
        borderRadius: 12,
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: Colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadow.subtle,
    },
    boxActive: {
        borderColor: Colors.primary,
        backgroundColor: '#F5F3FF', // Very light violet
        borderWidth: 2,
    },
    boxCurrent: {
        borderColor: Colors.primary,
        borderWidth: 2,
    },
    input: {
        fontSize: 24,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
        textAlign: 'center',
        width: '100%',
        height: '100%',
        ...Platform.select({
            android: {
                paddingVertical: 0,
            }
        })
    }
});

export default PinInput;

