import { useState } from "react";
import { motion } from "framer-motion";
import { FaTruck } from "react-icons/fa";
import API from "../services/api";

function LoginPage() {

    const [rfcEmpresa, setRfcEmpresa] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const login = async () => {

        try {

            console.log("Intentando login...");

            const response = await API.post("/auth/login", {
                email,
                password,
                rfcEmpresa
            });

            console.log(response.data);

            if (response.data.error) {
                alert(response.data.error);
                return;
            }

            localStorage.setItem("token", response.data.token);
            localStorage.setItem("role", response.data.role);
            localStorage.setItem("usuario", response.data.name);
            localStorage.setItem("email", response.data.email);
            localStorage.setItem("empresa", response.data.empresa || "");

            window.location.href = "/dashboard";

        } catch (error) {

            console.log(error);

            alert(error?.response?.data?.error || "Correo, contrase帽a o RFC de empresa incorrectos");
        }
    };

    return (

        <div
            style={{
                background:
                    "linear-gradient(135deg,#000000,#020617,#0f172a)",
                minHeight: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden",
                position: "relative"
            }}
        >

            {/* Luces */}
            <div
                style={{
                    position: "absolute",
                    width: "500px",
                    height: "500px",
                    background: "#2563eb",
                    borderRadius: "50%",
                    filter: "blur(180px)",
                    top: "-100px",
                    left: "-100px",
                    opacity: 0.3
                }}
            />

            <div
                style={{
                    position: "absolute",
                    width: "400px",
                    height: "400px",
                    background: "#06b6d4",
                    borderRadius: "50%",
                    filter: "blur(180px)",
                    bottom: "-100px",
                    right: "-100px",
                    opacity: 0.3
                }}
            />

            {/* Cami贸n */}
            <motion.div
                initial={{ x: -500 }}
                animate={{ x: 1500 }}
                transition={{
                    repeat: Infinity,
                    duration: 8,
                    ease: "linear"
                }}
                style={{
                    position: "absolute",
                    bottom: "60px",
                    fontSize: "70px",
                    color: "#3b82f6",
                    opacity: 0.25
                }}
            >
                <FaTruck />
            </motion.div>

            {/* Card */}
            <motion.div

                initial={{
                    opacity: 0,
                    y: 80
                }}

                animate={{
                    opacity: 1,
                    y: 0
                }}

                transition={{
                    duration: 1
                }}

                style={{
                    width: "420px",
                    padding: "50px",
                    borderRadius: "30px",
                    background: "rgba(255,255,255,0.08)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(59,130,246,0.3)",
                    boxShadow:
                        "0 0 40px rgba(59,130,246,0.35)",
                    color: "white",
                    position: "relative",
                    zIndex: 10
                }}
            >

                {/* Logo */}
                <motion.img
                    src="/veltrax.png"
                    alt="VELTRAX"
                    animate={{
                        scale: [1, 1.05, 1]
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: 3
                    }}
                    style={{
                        width: "280px",
                        display: "block",
                        margin: "0 auto 20px auto",
                        filter:
                            "drop-shadow(0 0 20px rgba(59,130,246,0.8))"
                    }}
                />

                <h1
                    style={{
                        textAlign: "center",
                        fontSize: "38px",
                        fontWeight: "bold",
                        marginBottom: "10px"
                    }}
                >
                    VELTRAX ERP
                </h1>

                <p
    style={{
        textAlign: "center",
        color: "#ffffff",
        marginBottom: "30px",
        fontSize: "15px",
        fontWeight: "300",
        letterSpacing: "2px",
        opacity: 0.9,
        textShadow: "0 0 10px rgba(255,255,255,0.5)"
    }}
>
    Plataforma log铆stica inteligente
</p>

                {/* RFC de empresa */}
                <input
                    type="text"
                    placeholder="RFC de tu empresa"
                    value={rfcEmpresa}
                    onChange={(e)=>
                        setRfcEmpresa(e.target.value.toUpperCase())
                    }
                    style={{
                        width: "100%",
                        padding: "16px",
                        marginBottom: "20px",
                        borderRadius: "12px",
                        border: "1px solid #06b6d4",
                        background: "rgba(0,0,0,0.4)",
                        color: "white",
                        outline: "none",
                        letterSpacing: "1px",
                        textTransform: "uppercase"
                    }}
                />

                {/* Email */}
                <input
                    type="email"
                    placeholder="Correo"
                    value={email}
                    onChange={(e)=>
                        setEmail(e.target.value)
                    }
                    style={{
                        width: "100%",
                        padding: "16px",
                        marginBottom: "20px",
                        borderRadius: "12px",
                        border: "1px solid #3b82f6",
                        background: "rgba(0,0,0,0.4)",
                        color: "white",
                        outline: "none"
                    }}
                />

                {/* Password */}
                <input
                    type="password"
                    placeholder="Contrase帽a"
                    value={password}
                    onChange={(e)=>
                        setPassword(e.target.value)
                    }
                    style={{
                        width: "100%",
                        padding: "16px",
                        marginBottom: "30px",
                        borderRadius: "12px",
                        border: "1px solid #3b82f6",
                        background: "rgba(0,0,0,0.4)",
                        color: "white",
                        outline: "none"
                    }}
                />

                {/* Bot贸n */}
                <motion.button

                    whileHover={{
                        scale: 1.05
                    }}

                    whileTap={{
                        scale: 0.95
                    }}

                    onClick={login}

                    style={{
                        width: "100%",
                        padding: "16px",
                        borderRadius: "12px",
                        border: "none",
                        background:
                            "linear-gradient(90deg,#06b6d4,#2563eb)",
                        color: "white",
                        fontWeight: "bold",
                        fontSize: "18px",
                        cursor: "pointer"
                    }}
                >
                    INICIAR SESI脫N
                </motion.button>

            </motion.div>

        </div>
    );
}

export default LoginPage;
