const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const sendEmail = require('../utils/emailConfig');
const { secretKey, expiresIn } = require("../config/jwtConfig");

// Generate OTP Function
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();


exports.renderRegisterPage = (req, res) => {
    res.render("auth/register");
};

exports.renderLoginPage = (req, res) => {
    res.render("auth/login");
};

exports.renderForgotPasswordPage = (req, res) => {
    res.render("auth/forgot-password");
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // ✅ Check if the user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "Invalid email or password." });
        }

        // ✅ Check if password is correct
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid email or password." });
        }

        // ✅ Check if the user is verified
        if (!user.verified) {
            return res.status(400).json({ error: "Account not verified. Please verify your email with OTP." });
        }

        // ✅ Generate JWT Token
        const token = jwt.sign(
            { userId: user._id, name: user.name, email: user.email, role: user.role },
            secretKey,
            { expiresIn }
        );

        // ✅ Store token in MongoDB
        user.tokens.push({ token });
        await user.save();

        // ✅ Store JWT in HTTP-only Cookie
        res.cookie("authToken", token, {
            httpOnly: true,
            secure: false, // Set `true` in production with HTTPS
            maxAge: 24 * 60 * 60 * 1000 // Token expires in 24 hours
        });

        // ✅ Redirect user based on role
        const redirectRoute = user.role === "admin" ? "/admin" : "/dashboard";

        res.json({ success: true, message: "Login successful", token, redirectRoute });

    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: "Server error." });
    }
};



// ✅ Register User & Send OTP
exports.register = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "User already exists." });

        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // ✅ Expires in 5 minutes

        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ Get admin emails from .env
        const adminEmails = process.env.ADMIN_EMAILS.split(","); // Convert to array
        const role = adminEmails.includes(email) ? "admin" : "user"; // ✅ Assign role dynamically

        const newUser = new User({ name, email, password: hashedPassword, otp, otpExpires, role });
        await newUser.save();

        // ✅ Send OTP via Email (implement sendOtpEmail function)
        // await sendOtpEmail(email, otp);

        // Send OTP email
        try {
            const html = `<p>Your OTP is: ${otp}</p>`;
            await sendEmail(email, 'Verify Your OTP', html);
        } catch (emailError) {
            console.error("Email sending failed:", emailError);
            return res.status(500).json({ error: 'Failed to send OTP. Please try again later.' });
        }

        res.status(200).json({ success: true, message: "User registered. OTP sent to email." });
    } catch (error) {
        res.status(500).json({ error: "Server error." });
    }
};

// ✅ Verify OTP & Generate JWT
exports.verifyOTP = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ error: "Invalid or expired OTP" });
        }

        user.verified = true;
        user.otp = null;
        user.otpExpires = null;

        // ✅ Generate JWT Token
        const token = jwt.sign({ userId: user._id, name: user.name, email: user.email, role: user.role }, secretKey, { expiresIn });

        user.tokens.push({ token });
        await user.save();

        res.cookie("authToken", token, { httpOnly: true, secure: false, maxAge: 24 * 60 * 60 * 1000 }); // ✅ Store JWT in cookies
        res.json({ success: true, message: "Verification successful", token , role: user.role });
    } catch (err) {
        res.status(500).json({ error: "Server error." });
    }
};

// ✅ Logout (Remove JWT)
exports.logout = async (req, res) => {
    try {
        const token = req.cookies.authToken || req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ error: "Unauthorized: No token provided" });

        const user = await User.findOneAndUpdate({ "tokens.token": token }, { $pull: { tokens: { token } } }, { new: true });
        if (!user) return res.status(401).json({ error: "Invalid session" });

        res.clearCookie("authToken");
        res.json({ success: true, message: "Logged out successfully" });
    } catch (err) {
        res.status(500).json({ error: "Server error." });
    }
};
