export const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

export const validatePhone = (phone) => {
    return phone.length === 10 && /^\d+$/.test(phone);
};

export const validatePin = (pin) => {
    return pin.length === 4 && /^\d+$/.test(pin);
};
