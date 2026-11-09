import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import axiosInstance from "../../api/axiosInstance";

const Penilaian = () => {
  const [timeLeft, setTimeLeft] = useState(10);
  const [error, setError] = useState(null);
  const [isPosting, setIsPosting] = useState(true);
  const navigate = useNavigate();
  const { tryoutId } = useParams();

  useEffect(() => {
    const postFinalize = async () => {
      try {
        setIsPosting(true);
        setError(null);
        await axiosInstance.post(`/API/student/tryout/${tryoutId}/finalize`);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Terjadi kesalahan saat memproses penilaian."
        );
      } finally {
        setIsPosting(false);
      }
    };
    postFinalize();
  }, [tryoutId]);

  useEffect(() => {
    if (!isPosting && timeLeft === 0) {
      navigate(`/siswa/tryout/${tryoutId}/hasil`);
      return;
    }
    if (!isPosting) {
      const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, isPosting, navigate, tryoutId]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1e3351 0%, #1a2a40 100%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          background: "rgba(42, 60, 87, 0.5)",
          padding: "2.5rem",
          borderRadius: "0.5rem",
          textAlign: "center",
          color: "white",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          minWidth: 320,
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: 24 }}>
          Jawaban anda sedang diproses
        </h1>
        {error ? (
          <div style={{ color: "#f87171", marginBottom: 16 }}>{error}</div>
        ) : (
          <div
            style={{
              fontSize: "2rem",
              fontFamily: "monospace",
              marginBottom: 8,
            }}
          >
            {isPosting
              ? "Menghitung skor..."
              : timeLeft > 0
              ? `Mengalihkan dalam ${timeLeft} detik...`
              : ""}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Penilaian;
