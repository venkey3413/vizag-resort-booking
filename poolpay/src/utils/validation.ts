// Phone number validation (Indian format)
export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
};

// UPI ID validation
export const validateUpiId = (upiId: string): boolean => {
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
  return upiRegex.test(upiId);
};

// Combined validation for UPI ID or Phone
export const validateUpiOrPhone = (input: string): { isValid: boolean; type: 'phone' | 'upi' | 'invalid'; formatted?: string } => {
  const cleanInput = input.trim();
  
  // Check if it's a valid phone number
  if (validatePhoneNumber(cleanInput)) {
    return {
      isValid: true,
      type: 'phone',
      formatted: `${cleanInput}@paytm` // Convert to UPI format
    };
  }
  
  // Check if it's a valid UPI ID
  if (validateUpiId(cleanInput)) {
    return {
      isValid: true,
      type: 'upi',
      formatted: cleanInput
    };
  }
  
  return {
    isValid: false,
    type: 'invalid'
  };
};

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Amount validation
export const validateAmount = (amount: string): boolean => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && num <= 100000; // Max ₹1 lakh
};