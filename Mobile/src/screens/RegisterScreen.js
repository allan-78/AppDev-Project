import React, { useState, useEffect, useRef } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View, Animated, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../styles/styles";
import PrimaryButton from "../components/PrimaryButton";
import { useAuth } from "../store/AuthProvider";

function sanitize(value) {
  return String(value || "").replace(/[<>]/g, "").trim();
}

function checkEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

const passwordRules = [
  { key: "length", label: "10+ characters", test: (p) => p.length >= 10 },
  { key: "upper", label: "Uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { key: "lower", label: "Lowercase letter", test: (p) => /[a-z]/.test(p) },
  { key: "digit", label: "Number", test: (p) => /\d/.test(p) },
  { key: "symbol", label: "Symbol (!@#...)", test: (p) => /[^A-Za-z\d]/.test(p) }
];

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({ fullName: "", email: "", password: "", phone: "", address: "", joinCode: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});
  const { register } = useAuth();

  // Entrance animation
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(30)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 500, useNativeDriver: true })
    ]).start();
  }, []);

  function setField(key, value) {
    setForm({ ...form, [key]: value });
    setTouched({ ...touched, [key]: true });
  }

  const emailValid = checkEmail(form.email);
  const passwordMet = passwordRules.filter((r) => r.test(form.password));
  const passwordStrong = passwordMet.length === passwordRules.length;
  const nameValid = sanitize(form.fullName).length >= 2;
  const joinCodeValid = form.joinCode.trim().length >= 3;

  async function submit() {
    if (loading) return;
    setMessage("");
    setTouched({ fullName: true, email: true, password: true, phone: true, address: true, joinCode: true });

    if (!nameValid) return setMessage("Enter your full name.");
    if (!emailValid) return setMessage("Enter a valid email address.");
    if (!passwordStrong) return setMessage("Password does not meet all requirements.");
    if (!joinCodeValid) return setMessage("Enter your community join code.");

    setLoading(true);
    try {
      const sanitizedForm = {
        fullName: sanitize(form.fullName),
        email: sanitize(form.email).toLowerCase(),
        password: form.password,
        phone: sanitize(form.phone),
        address: sanitize(form.address),
        joinCode: sanitize(form.joinCode).toUpperCase()
      };
      await register(sanitizedForm);
      setMessage("Registration submitted. Sign in after admin approval.");
      navigation.navigate("Pending", { joinCode: sanitizedForm.joinCode });
    } catch (err) {
      setMessage(err?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function renderField(key, placeholder, options = {}) {
    const { secure, keyboardType, autoComplete, required } = options;
    const isPassword = key === "password";
    return (
      <View>
        <Text style={styles.authInputLabel}>{placeholder}{required ? " *" : ""}</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={form[key]}
            onChangeText={(v) => setField(key, v)}
            placeholder={placeholder}
            placeholderTextColor="#94a3b8"
            secureTextEntry={isPassword && !showPassword}
            autoCapitalize="none"
            keyboardType={keyboardType || "default"}
            autoComplete={autoComplete || "off"}
            accessibilityLabel={placeholder}
          />
          {isPassword ? (
            <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowPassword(!showPassword)} accessibilityRole="button">
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748b" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.authBg}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Top bar */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8 }}>
          <TouchableOpacity onPress={() => navigation.navigate("Login")} accessibilityRole="button" accessibilityLabel="Back to login">
            <Ionicons name="arrow-back" size={22} color="#fffaf1" />
          </TouchableOpacity>
          <Text style={[styles.authLogoTitle, { fontSize: 16, marginLeft: 12 }]}>NeighborhoodShare</Text>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }} keyboardShouldPersistTaps="handled">
            <Animated.View style={[styles.authPanel, { opacity: fade, transform: [{ translateY: slide }] }]}>
              <Text style={styles.authTitle}>Create account</Text>
              <Text style={styles.authCopy}>Register as a verified community resident to start borrowing and lending tools.</Text>

              <View style={styles.authDivider} />

              {renderField("fullName", "Full name", { required: true, autoComplete: "name" })}
              {touched.fullName && !nameValid ? <Text style={styles.fieldError}>Name is required</Text> : null}

              {renderField("email", "Email", { required: true, keyboardType: "email-address", autoComplete: "email" })}
              {touched.email && form.email.length > 0 && !emailValid ? <Text style={styles.fieldError}>Enter a valid email address</Text> : null}
              {touched.email && form.email.length > 0 && emailValid ? <Text style={styles.fieldSuccess}>Valid email</Text> : null}

              {renderField("password", "Password", { secure: true, required: true, autoComplete: "new-password" })}
              {/* Password strength indicators */}
              <View style={{ gap: 3 }}>
                {passwordRules.map((rule) => {
                  const met = rule.test(form.password);
                  return (
                    <View style={styles.passwordHint} key={rule.key}>
                      <Ionicons name={met ? "checkmark-circle" : "ellipse-outline"} size={14} color={met ? "#16a34a" : "#94a3b8"} />
                      <Text style={met ? styles.passwordHintMet : styles.passwordHintText}>{rule.label}</Text>
                    </View>
                  );
                })}
              </View>

              {renderField("phone", "Phone", { keyboardType: "phone-pad", autoComplete: "tel" })}
              {renderField("address", "Address", { autoComplete: "street-address" })}
              {renderField("joinCode", "Community join code", { required: true })}
              {touched.joinCode && !joinCodeValid ? <Text style={styles.fieldError}>A valid join code is required</Text> : null}

              {message ? <Text style={styles.error}>{message}</Text> : null}

              <PrimaryButton onPress={submit} disabled={loading}>
                {loading ? "Submitting…" : "Submit registration"}
              </PrimaryButton>

              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.link}>Already have an account? Sign in</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
