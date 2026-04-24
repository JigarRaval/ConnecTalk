import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer, Bounce } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "../context/ThemeContext";

const url = import.meta.env.VITE_URL;

const Login = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const canvasRef = useRef(null);
  const [formData, setFormData] = useState({ username: "", password: "" });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    let animationId;
    let particles = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const count = Math.min(
        180,
        Math.floor((canvas.width * canvas.height) / 6500)
      );

      particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 3.2 + 1,
        speedX: (Math.random() - 0.5) * 0.45,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.35 + 0.08,
        pulse: Math.random() * Math.PI * 2,
      }));
    };

    const drawParticles = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particleColor =
        theme === "dark" ? "rgba(231, 221, 208, " : "rgba(120, 113, 108, ";

      particles.forEach((particle) => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.pulse += 0.02;

        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        const alpha = Math.sin(particle.pulse) * 0.12 + particle.opacity;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${particleColor}${alpha})`;
        ctx.fill();
      });

      animationId = requestAnimationFrame(drawParticles);
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    drawParticles();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [theme]);

  const handleChange = (event) =>
    setFormData({ ...formData, [event.target.name]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await axios.post(`${url}/api/auth/login`, formData);
      localStorage.setItem("token", response.data.token);
      navigate("/home", {
        state: {
          userId: response.data.userId,
          username: response.data.username,
          image: response.data.image,
        },
      });
    } catch (error) {
      toast.warn(error.response?.data?.message || "Login failed", {
        position: "top-center",
        autoClose: 5000,
        theme: "dark",
        transition: Bounce,
      });
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(160deg,#f7f2eb_0%,#eee5d8_38%,#f8f5ef_100%)] px-4 py-8 dark:bg-[linear-gradient(160deg,#161411_0%,#1f1a16_45%,#12100d_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-35 dark:opacity-20">
        <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="login-grid"
              width="52"
              height="52"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 52 0 L 0 0 0 52"
                fill="none"
                stroke="rgba(120,113,108,.22)"
                strokeWidth="0.8"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#login-grid)" />
        </svg>
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(245,158,11,0.2),_transparent_62%)] blur-[120px] dark:bg-[radial-gradient(circle,_rgba(245,158,11,0.14),_transparent_62%)]" />
      </div>

      <canvas ref={canvasRef} className="absolute inset-0 z-10 h-full w-full" />

      <Helmet>
        <title>ConnecTalk - Login</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Sora:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </Helmet>
      <ToastContainer />

      <div className="relative z-20 w-full max-w-md animate-fade-in-up font-[Manrope]">
        <div className="overflow-hidden rounded-[32px] border border-stone-200/75 bg-white/88 shadow-[0_30px_90px_rgba(28,25,23,0.14)] backdrop-blur-xl dark:border-stone-700/60 dark:bg-stone-900/82">
          <div className="border-b border-stone-200/70 px-7 pb-5 pt-8 text-center dark:border-stone-700/70">
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500 dark:text-stone-400">
              Welcome Back
            </p>
            <h1
              className="mt-3 text-4xl font-semibold text-stone-900 dark:text-stone-100"
              style={{ fontFamily: '"Sora", sans-serif' }}
            >
              ConnecTalk
            </h1>
            <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-stone-300">
              Secure collaboration in a calmer, more professional workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-7">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-stone-700 dark:text-stone-300">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:focus:border-stone-500 dark:focus:ring-stone-700"
                autoComplete="off"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-stone-700 dark:text-stone-300">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:focus:border-stone-500 dark:focus:ring-stone-700"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-stone-900 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-white transition hover:-translate-y-0.5 hover:bg-stone-700 active:translate-y-0 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
            >
              Login
            </button>

            <p className="text-center text-sm text-stone-600 dark:text-stone-400">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="font-semibold text-amber-700 hover:underline dark:text-amber-300"
              >
                Register
              </button>
            </p>
          </form>
        </div>

        <p className="mt-6 text-center text-xs uppercase tracking-[0.2em] text-stone-600/80 dark:text-stone-400">
          Securely connect • Stay in touch
        </p>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Login;
