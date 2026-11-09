"use client";

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance";

const EditTryout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tryoutId, setTryoutId] = useState(null);
  const [namaTryout, setNamaTryout] = useState("");
  const [examMode, setExamMode] = useState("demo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      setTryoutId(id);
      fetchTryoutData(id);
    } else {
      setError("ID Tryout tidak ditemukan di URL.");
      setLoading(false);
    }
  }, [searchParams]);

  const fetchTryoutData = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get(`/API/teacher/tryout/${id}`);
      
      if (response.data && response.data.result) {
        const tryoutData = response.data.result;
        setNamaTryout(tryoutData.tryout_name || "");
        setExamMode(tryoutData.exam_mode || "demo");
      } else {
        setError("Format data tryout tidak sesuai atau data tidak ditemukan.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Gagal memuat data tryout");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.patch(`/API/teacher/tryout/update/${tryoutId}`, {
        tryout_name: namaTryout,
        exam_mode: examMode
      });

      if (response.data.success || response.status === 200) {
        navigate("/guru/tryout", {
          state: {
            notification: {
              type: 'success',
              message: 'Tryout berhasil diperbarui!'
            }
          },
          replace: true
        });
      } else {
        setError("Gagal memperbarui tryout");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Gagal memperbarui tryout");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/guru/tryout", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center">
        <div className="text-[#2f4a64]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-[#2f4a64] mb-6">Edit Tryout</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Tryout
            </label>
            <input
              type="text"
              value={namaTryout}
              onChange={(e) => setNamaTryout(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f4a64] text-gray-900 bg-white"
              placeholder="Masukkan nama tryout"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pilih Mode Waktu Ujian
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setExamMode('demo')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                  examMode === 'demo'
                    ? 'border-[#2f4a64] bg-[#2f4a64]/5 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-gray-900 text-sm">Mode Demo (Cepat)</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">1 - 4 Menit</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Durasi singkat per subtes untuk demonstrasi cepat.
                </p>
              </div>

              <div
                onClick={() => setExamMode('standard')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                  examMode === 'standard'
                    ? 'border-[#2f4a64] bg-[#2f4a64]/5 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-gray-900 text-sm">Standar UTBK</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">195 Menit</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Durasi resmi UTBK-SNBT (15 - 45 menit per subtes).
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 min-h-[44px] cursor-pointer"
            >
              Batalkan
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#2f4a64] text-white rounded-lg hover:bg-[#1e3247] transition-colors min-h-[44px] cursor-pointer font-medium"
              disabled={loading}
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTryout;
