"use client"

import { motion } from "framer-motion"
import { CheckCircle, XCircle, HelpCircle, BarChart3, BookOpen, Award, ArrowLeft, AlertTriangle } from "lucide-react"
import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import axiosInstance from "../../api/axiosInstance"

export default function SiswaTryoutHasil() {
  const [hoveredCard, setHoveredCard] = useState(null)
  const [tryoutResults, setTryoutResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const { id } = useParams()
  const [subjectList, setSubjectList] = useState([])

  // Cek status diskualifikasi dari storage lokal atau skor 0
  const isDisqualified = localStorage.getItem(`tryout_${id}_disqualified`) === 'true'

  useEffect(() => {
    const fetchTryoutResults = async () => {
      try {
        const response = await axiosInstance.get(`/API/student/tryout/${id}/result`)
        const raw = response.data
        const summary = Array.isArray(raw.summary) ? raw.summary[0] : raw.summary
        setTryoutResults({ summary, perCategorySubject: raw.perCategorySubject })
        setLoading(false)
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch tryout results')
        setLoading(false)
      }
    }
    fetchTryoutResults()
  }, [id])

  useEffect(() => {
    axiosInstance.get(`/API/student/tryout/${id}`)
      .then(res => {
        let subjects = res.data.getTryout.subjects
        if (typeof subjects === 'string') {
          subjects = JSON.parse(subjects)
        }
        setSubjectList(subjects)
      })
      .catch(err => {
        console.error("Gagal memuat subjek tryout:", err)
      })
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1E3A5F]"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500 text-center">
          <p className="text-xl font-semibold mb-2">Error</p>
          <p>{error}</p>
          <button 
            onClick={() => navigate('/siswa/tryout')}
            className="mt-4 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg cursor-pointer"
          >
            Back to Tryout
          </button>
        </div>
      </div>
    )
  }

  // Get metrics from API data
  const metrics = tryoutResults?.summary ? [
    { title: "Nilai rata-rata", value: tryoutResults.summary.average_score?.toString(), icon: <Award size={28} className="text-yellow-300 mb-1" /> },
    { title: "Total Jawaban Benar", value: tryoutResults.summary.total_correct?.toString(), icon: <CheckCircle size={28} className="text-green-400 mb-1" /> },
    { title: "Total Jawaban Salah", value: tryoutResults.summary.total_wrong?.toString(), icon: <XCircle size={28} className="text-red-400 mb-1" /> },
    { title: "Total Jawaban Kosong", value: tryoutResults.summary.total_empty?.toString(), icon: <HelpCircle size={28} className="text-gray-400 mb-1" /> },
  ] : []

  return (
    <div className="bg-gradient-to-b from-[#F5F0E9] to-[#EAE5DE] flex flex-col items-center p-6 min-h-screen w-screen">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-5xl space-y-6"
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex items-center justify-between mb-6"
        >
          <motion.a 
            href="/siswa/tryout" 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }}
          >
            <motion.button
              className="bg-gradient-to-r from-[#1E3A5F] to-[#2E4A7F] text-white p-3 rounded-full shadow-md flex items-center justify-center cursor-pointer"
              style={{ boxShadow: "0 4px 6px -1px rgba(30, 58, 95, 0.3)" }}
            >
              <ArrowLeft size={20} />
            </motion.button>
          </motion.a>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-2xl font-bold text-[#1E3A5F] flex items-center"
          >
            <span className="bg-[#1E3A5F] h-6 w-1.5 rounded-full mr-2 inline-block"></span>
            Hasil Tryout SNBT
          </motion.h1>
          <div className="w-10"></div>
        </motion.div>

        {/* Banner Diskualifikasi jika terdeteksi */}
        {isDisqualified && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/10 border-2 border-red-500 rounded-xl p-5 text-red-900 flex items-start gap-4 shadow-sm"
          >
            <div className="p-3 bg-red-600 text-white rounded-xl flex-shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-700">Ujian Didiskualifikasi (Nilai: 0)</h2>
              <p className="text-sm text-red-800 mt-1 leading-relaxed">
                Sistem mendeteksi pelanggaran berupa meninggalkan halaman ujian sebanyak 3 kali. Sesuai integritas sistem UTBK-SNBT, sesi tryout ini telah dibatalkan secara otomatis dengan perolehan skor 0 pada seluruh subtes.
              </p>
            </div>
          </motion.div>
        )}

        {/* Header Box: Nilai Rata-rata, Benar, Salah, Kosong */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gradient-to-br from-[#1E3A5F] to-[#2E4A7F] text-white p-6 rounded-xl shadow-lg mb-4">
          {metrics.map((item, index) => (
            <div key={index} className="flex flex-col items-center justify-center p-2 rounded-xl">
              {item.icon}
              <span className="text-xs text-blue-200 mt-1 mb-1 text-center">{item.title}</span>
              <span className="text-2xl font-bold text-white">{item.value}</span>
            </div>
          ))}
        </div>

        {/* Detail per kategori dan subjek */}
        {tryoutResults?.perCategorySubject?.map((cat, idx) => (
          <div key={idx} className="bg-[#22345A] rounded-xl p-4 mb-4">
            <h2 className="text-lg font-bold text-white mb-2">{cat.result.nama_kategori}</h2>
            {cat.result.subjek?.map((sub, i) => {
              const found = subjectList.find(s =>
                (s.subject_name || s.nama_subjek) === (sub.nama_subjek || sub.subject_name)
              )
              const subjectId = found ? found.subject_id : undefined

              return (
                <div
                  key={i}
                  className="bg-[#2C4A6E] rounded-xl p-4 mb-3 cursor-pointer hover:bg-[#2C4A6E]/80 transition-colors"
                  onClick={() => subjectId && navigate(`/siswa/tryout/${id}/${subjectId}/pembahasan`)}
                >
                  <div className="font-semibold text-white mb-2">{sub.nama_subjek}</div>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    <div className="flex flex-col items-center bg-[#22345A] rounded-lg p-2">
                      <Award size={18} className="text-yellow-300 mb-1" />
                      <span className="text-xs text-blue-100">Nilai</span>
                      <span className="font-bold text-white">{sub.nilai_rata_rata}</span>
                    </div>
                    <div className="flex flex-col items-center bg-[#22345A] rounded-lg p-2">
                      <CheckCircle size={18} className="text-green-400 mb-1" />
                      <span className="text-xs text-blue-100">Total Jawaban Benar</span>
                      <span className="font-bold text-white">{sub.total_jawaban_benar}</span>
                    </div>
                    <div className="flex flex-col items-center bg-[#22345A] rounded-lg p-2">
                      <XCircle size={18} className="text-red-400 mb-1" />
                      <span className="text-xs text-blue-100">Total Jawaban Salah</span>
                      <span className="font-bold text-white">{sub.total_jawaban_salah}</span>
                    </div>
                    <div className="flex flex-col items-center bg-[#22345A] rounded-lg p-2">
                      <HelpCircle size={18} className="text-gray-400 mb-1" />
                      <span className="text-xs text-blue-100">Total Jawaban Kosong</span>
                      <span className="font-bold text-white">{sub.total_jawaban_kosong}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {/* Button Keluar */}
        <div className="flex justify-center mt-6">
          <button
            onClick={() => navigate('/siswa/tryout')}
            className="min-h-[44px] bg-gradient-to-r from-[#1E3A5F] to-[#2E4A7F] hover:from-[#254673] hover:to-[#375896] text-white px-8 py-3 rounded-xl text-lg font-semibold shadow-lg cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:ring-offset-2"
            style={{ boxShadow: "0 10px 15px -3px rgba(30, 58, 95, 0.3)" }}
          >
            Keluar
          </button>
        </div>
      </motion.div>
    </div>
  )
}
