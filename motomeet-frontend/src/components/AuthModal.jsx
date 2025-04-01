import { useState } from "react";
import Select from "react-select";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";// adjust path if needed
import React from 'react';

axios.defaults.withCredentials = true;

export default function AuthModal() {
    const [showModal, setShowModal] = useState(false);
    const [formType, setFormType] = useState("login"); // 'login' or 'signup'
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [signupEmail, setSignUpEmail] = useState("");
    const [signupPassword, setSignUpPassword] = useState("");
    const [signupMake, setSignUpMake] = useState("");
    const [signupModel, setSignUpModel] = useState("");
    const [signupName, setSignUpName] = useState("");
    const [signupPasswordConfirm, setSignUpPasswordConfirm] = useState("");
    const navigate = useNavigate();
    const { setUser } = useUser();

    const motorcycleOptions = [
        { value: "Aprilia", label: "Aprilia" },
        { value: "BMW", label: "BMW" },
        { value: "Ducati", label: "Ducati" },
        { value: "Harley-Davidson", label: "Harley-Davidson" },
        { value: "Honda", label: "Honda" },
        { value: "Indian", label: "Indian" },
        { value: "Kawasaki", label: "Kawasaki" },
        { value: "KTM", label: "KTM" },
        { value: "Moto Guzzi", label: "Moto Guzzi" },
        { value: "Royal Enfield", label: "Royal Enfield" },
        { value: "Suzuki", label: "Suzuki" },
        { value: "Triumph", label: "Triumph" },
        { value: "Yamaha", label: "Yamaha" },
        { value: "Other", label: "Other" },
    ];
    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post("http://localhost:5000/api/login", {
                email: loginEmail,
                pwd: loginPassword
            }, {
                withCredentials: true
            });
            if (res.data.message === "User Authenticated!") {
                setUser({ email: loginEmail });  // optionally also name, make, etc.
                console.log("Logged in: ", loginEmail);
                setShowModal(false);
                navigate('/home');
            };
        } catch (error) {
            console.log(error);
            alert("Login failed. Check your credentials.");
        }
    };
    

    const handleSignUp = async (e) => {
        e.preventDefault();
        if (signupPassword === signupPasswordConfirm) {
            try {
                const res = await axios.post("http://localhost:5000/api/signup", {
                    email: signupEmail,
                    pwd: signupPassword,
                    name: signupName,
                    make: signupMake,
                    model: signupModel
                }, {
                    withCredentials: true
                });
                if (res.data.message === "User created successfully") {
                    const token = res.data.token;
                    localStorage.setItem("token", token);
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    console.log("Token being sent:", axios.defaults.headers.common["Authorization"]);
                    setUser({ email: res.data.email, name: signupName }); // optionally store more
                    console.log("Signed up and logged in: ", res.data.email);
                    setShowModal(false);
                    navigate('/set_location');
                };
            } catch (error) {
                console.log(error);
                alert("Signup failed. Try again.");
            }
        } else {
            alert("Passwords do not match.");
        }
    };
    
    return (
        <>
            <button
                className="bg-gradient-to-r from-purple-500 via-indigo-600 to-teal-400 text-white px-6 py-3 rounded-xl text-lg shadow-md hover:scale-105 transition"
                onClick={() => setShowModal(true)}
            >
                Join for free!
            </button>

            {showModal && (
                <div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="relative bg-white rounded-xl w-[90%] max-w-md p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            className="absolute top-3 right-4 text-2xl text-gray-400 hover:text-gray-600"
                            onClick={() => setShowModal(false)}
                        >
                            &times;
                        </button>

                        <h2 className="text-2xl font-bold text-center mb-4">
                            {formType === "login" ? "Login" : "Sign Up"}
                        </h2>

                        {/* Toggle Buttons */}
                        <div className="flex justify-center gap-4 mb-4">
                            <button
                                onClick={() => setFormType("login")}
                                className={`px-4 py-2 rounded-md font-medium transition ${formType === "login"
                                    ? "bg-purple-600 text-white"
                                    : "bg-gray-200 text-gray-700"
                                    }`}
                            >
                                Login
                            </button>
                            <button
                                onClick={() => setFormType("signup")}
                                className={`px-4 py-2 rounded-md font-medium transition ${formType === "signup"
                                    ? "bg-purple-600 text-white"
                                    : "bg-gray-200 text-gray-700"
                                    }`}
                            >
                                Signup
                            </button>
                        </div>

                        {/* Form Container */}
                        <div className="overflow-hidden relative w-full">
                            <div
                                className="flex w-[200%] transition-transform duration-300"
                                style={{
                                    transform:
                                        formType === "login"
                                            ? "translateX(0%)"
                                            : "translateX(-50%)",
                                }}
                            >
                                {/* Login Form */}
                                <div className="w-full px-4">
                                    <form onSubmit={handleLogin}>
                                        <input
                                            type="email"
                                            name="email"
                                            placeholder="Enter Email"
                                            className="w-full p-3 mb-3 border border-gray-300 rounded"
                                            value={loginEmail}
                                            onChange={(e) => setLoginEmail(e.target.value)}
                                            required
                                        />
                                        <input
                                            type="password"
                                            name="pwd"
                                            placeholder="Enter Password"
                                            className="w-full p-3 mb-3 border border-gray-300 rounded"
                                            value={loginPassword}
                                            onChange={(e) => setLoginPassword(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="submit"
                                            className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700 transition"
                                        >
                                            Login
                                        </button>
                                    </form>
                                </div>

                                {/* Signup Form */}
                                <div className="w-full px-4">
                                    <form onSubmit={handleSignUp}>
                                        <input
                                            type="text"
                                            name="name"
                                            placeholder="Enter Your Name"
                                            className="w-full p-3 mb-3 border border-gray-300 rounded"
                                            value={signupName}
                                            onChange={(e) => setSignUpName(e.target.value)}
                                            required
                                        />
                                        <input
                                            type="email"
                                            name="email"
                                            placeholder="Enter Email"
                                            className="w-full p-3 mb-3 border border-gray-300 rounded"
                                            value={signupEmail}
                                            onChange={(e) => setSignUpEmail(e.target.value)}
                                            required
                                        />
                                        <div className="mb-3">
                                            <Select
                                                options={motorcycleOptions}
                                                placeholder="Enter Make"
                                                className="react-select-container mb-3"
                                                classNamePrefix="react-select"
                                                value={signupMake}
                                                onChange={(e) => setSignUpMake(e.target.value)}
                                                menuPortalTarget={document.body} // 👈 makes dropdown render to <body>
                                                styles={{
                                                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                                    control: (base) => ({
                                                        ...base,
                                                        textAlign: 'left', // ensures all text aligns left
                                                    }),
                                                }}
                                            />

                                        </div>
                                        <input
                                            type="text"
                                            name="model"
                                            placeholder="Enter Model"
                                            value={signupModel}
                                            onChange={(e) => setSignUpModel(e.target.value)}
                                            className="w-full p-3 mb-3 border border-gray-300 rounded"
                                            required
                                        />
                                        <input
                                            type="password"
                                            name="pwd"
                                            placeholder="Enter Password"
                                            value={signupPassword}
                                            onChange={(e) => setSignUpPassword(e.target.value)}
                                            className="w-full p-3 mb-3 border border-gray-300 rounded"
                                            required
                                        />
                                        <input
                                            type="password"
                                            placeholder="Confirm Password"
                                            className="w-full p-3 mb-3 border border-gray-300 rounded"
                                            value={signupPasswordConfirm}
                                            onChange={(e) => setSignUpPasswordConfirm(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="submit"
                                            className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700 transition"
                                        >
                                            Signup
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}