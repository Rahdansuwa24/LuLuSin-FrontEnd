"use client"

import { motion } from "framer-motion"
import { useState, useEffect, useRef, useCallback } from "react"
import { Clock, User, BookOpen, ArrowLeft, ArrowRight, AlertTriangle, ShieldAlert } from "lucide-react"
import { useParams, useNavigate } from "react-router-dom"
import axiosInstance from "../../api/axiosInstance"

export default function SiswaTryoutPengerjaan() {
  const navigate = useNavigate()
  const { id: idTryout, subjectId } = useParams()
  
  const [currentQuestion, setCurrentQuestion] = useState(1)
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(null)
  const [answeredQuestions, setAnsweredQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [examData, setExamData] = useState({
    studentData: null,
    subjectData: null,
    questionData: []
  })

  // State Anti-Cheat Proctoring
  const [violationCount, setViolationCount] = useState(() => {
    const saved = localStorage.getItem(`tryout_${idTryout}_violations`)
    return saved ? parseInt(saved, 10) : 0
  })
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [isDisqualified, setIsDisqualified] = useState(() => {
    return localStorage.getItem(`tryout_${idTryout}_disqualified`) === 'true'
  })
  const [isSubmittingDisqualify, setIsSubmittingDisqualify] = useState(false)
  const lastViolationTimeRef = useRef(0)

  // Helper untuk membersihkan data tryout di localStorage saat diskualifikasi
  const clearTryoutStorage = useCallback((tryoutId) => {
    for (let s = 1; s <= 7; s++) {
      localStorage.removeItem(`tryout_${tryoutId}_${s}_time`)
      localStorage.removeItem(`tryout_${tryoutId}_${s}_answers`)
      localStorage.removeItem(`tryout_${tryoutId}_${s}_answered`)
    }
  }, [])

  // Cek apakah siswa sudah berstatus didiskualifikasi sebelumnya
  useEffect(() => {
    if (localStorage.getItem(`tryout_${idTryout}_disqualified`) === 'true') {
      navigate(`/siswa/tryout/${idTryout}/hasil`, { replace: true })
    }
  }, [idTryout, navigate])

  // Fungsi proses diskualifikasi saat pelanggaran ke-3 tercapai
  const triggerDisqualification = useCallback(async () => {
    setIsDisqualified(true)
    setIsSubmittingDisqualify(true)
    setShowWarningModal(false)

    try {
      await axiosInstance.post(`/API/student/tryout/${idTryout}/disqualify`)
    } catch (err) {
      console.error("Gagal mengirim status diskualifikasi:", err)
    } finally {
      clearTryoutStorage(idTryout)
      localStorage.setItem(`tryout_${idTryout}_disqualified`, 'true')
      setIsSubmittingDisqualify(false)
      setTimeout(() => {
        navigate(`/siswa/tryout/${idTryout}/hasil`, { replace: true })
      }, 2500)
    }
  }, [idTryout, navigate, clearTryoutStorage])

  // Event listener anti-cheat: deteksi perpindahan tab (visibilitychange) dan kehilangan fokus (blur)
  useEffect(() => {
    if (loading || isDisqualified) return

    const handleViolationEvent = () => {
      const now = Date.now()
      // Debounce 1.5 detik untuk menghindari pemicuan ganda (blur dan visibilitychange bersamaan)
      if (now - lastViolationTimeRef.current < 1500) {
        return
      }
      lastViolationTimeRef.current = now

      setViolationCount((prev) => {
        const next = prev + 1
        localStorage.setItem(`tryout_${idTryout}_violations`, String(next))

        if (next >= 3) {
          triggerDisqualification()
        } else {
          setShowWarningModal(true)
        }
        return next
      })
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        handleViolationEvent()
      }
    }

    const onWindowBlur = () => {
      handleViolationEvent()
    }

    document.addEventListener("visibilitychange", onVisibilityChange)
    window.addEventListener("blur", onWindowBlur)

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.removeEventListener("blur", onWindowBlur)
    }
  }, [loading, isDisqualified, idTryout, triggerDisqualification])

  // Reset state setiap subjectId berubah
  useEffect(() => {
    setCurrentQuestion(1)
    setLoading(true)
    setError(null)
    setExamData({
      studentData: null,
      subjectData: null,
      questionData: []
    })
  }, [subjectId, idTryout])

  // Ambil data tryout setiap idTryout atau subjectId berubah
  useEffect(() => {
    const fetchTryoutData = async () => {
      try {
        setLoading(true)
        const response = await axiosInstance.get(`/API/student/tryout/${idTryout}/${subjectId}/taking`)

        if (!response.data) {
          throw new Error('Data tidak ditemukan')
        }

        // Simpan data ke state
        setExamData({
          studentData: response.data.studentData || {},
          subjectData: response.data.subjectData || {},
          questionData: Array.isArray(response.data.questionData) ? response.data.questionData : []
        })

        // Set timer berdasarkan total_waktu dari API atau dari localStorage jika ada
        if (response.data.subjectData?.total_waktu) {
          const minutes = parseInt(response.data.subjectData.total_waktu, 10)
          const savedTime = localStorage.getItem(`tryout_${idTryout}_${subjectId}_time`)
          
          if (savedTime) {
            const { minutes: savedMinutes, seconds: savedSeconds, timestamp } = JSON.parse(savedTime)
            const now = Date.now()
            const elapsedSeconds = Math.floor((now - timestamp) / 1000)
            const totalSeconds = savedMinutes * 60 + savedSeconds - elapsedSeconds
            
            if (totalSeconds > 0) {
              setTimeLeft({
                minutes: Math.floor(totalSeconds / 60),
                seconds: totalSeconds % 60
              })
            } else {
              setTimeLeft({ minutes, seconds: 0 })
            }
          } else {
            setTimeLeft({ minutes, seconds: 0 })
          }
        }

        // Load saved answers and answered questions from localStorage
        const savedAnswers = localStorage.getItem(`tryout_${idTryout}_${subjectId}_answers`)
        const savedAnsweredQuestions = localStorage.getItem(`tryout_${idTryout}_${subjectId}_answered`)
        
        if (savedAnswers) {
          setSelectedAnswers(JSON.parse(savedAnswers))
        }
        if (savedAnsweredQuestions) {
          setAnsweredQuestions(JSON.parse(savedAnsweredQuestions))
        }

        setLoading(false)
      } catch (err) {
        console.error('Error memuat data tryout:', err)
        const errorMessage = err.response?.data?.message || err.message || 'Terjadi kesalahan saat memuat data'
        setError(errorMessage)
        
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate('/login')
        }
        
        setLoading(false)
      }
    }

    fetchTryoutData()
  }, [idTryout, subjectId, navigate])

  // Efek timer + auto-submit jawaban null saat waktu habis
  useEffect(() => {
    if (!timeLeft || isDisqualified) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (!prev) return null

        // Countdown normal
        if (prev.seconds > 0) {
          const newTime = { minutes: prev.minutes, seconds: prev.seconds - 1 }
          localStorage.setItem(
            `tryout_${idTryout}_${subjectId}_time`,
            JSON.stringify({ ...newTime, timestamp: Date.now() })
          )
          return newTime
        }
        if (prev.minutes > 0) {
          const newTime = { minutes: prev.minutes - 1, seconds: 59 }
          localStorage.setItem(
            `tryout_${idTryout}_${subjectId}_time`,
            JSON.stringify({ ...newTime, timestamp: Date.now() })
          )
          return newTime
        }

        // Waktu habis: menit=0 & detik=0
        clearInterval(timer)
        localStorage.removeItem(`tryout_${idTryout}_${subjectId}_time`)

        // 1) Kumpulkan semua question_id
        const allIds = examData.questionData.map(q => q.question_id)
        // 2) Filter yang belum dijawab
        const unanswered = allIds.filter(id => !answeredQuestions.includes(id))
        // 3) POST null untuk tiap unanswered question
        unanswered.forEach(async questionId => {
          try {
            await axiosInstance.post(
              `/API/student/tryout/${idTryout}/${subjectId}/${questionId}/taking`,
              { answerOptionId: null }
            )
          } catch(err) {
            console.error(`Gagal submit null untuk soal ${questionId}:`, err)
          }
        })

        // 4) Hapus semua storage lokal subjek ini
        localStorage.removeItem(`tryout_${idTryout}_${subjectId}_answers`)
        localStorage.removeItem(`tryout_${idTryout}_${subjectId}_answered`)

        // 5) Navigasi: kalau bukan subjek terakhir -> peralihan, else -> penilaian
        const sid = Number(subjectId)
        const maxSid = 7
        if (sid < maxSid) {
          navigate(`/siswa/tryout/${idTryout}/${sid + 1}/peralihan`)
        } else {
          navigate(`/siswa/tryout/${idTryout}/penilaian`)
        }

        return prev
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [
    timeLeft,
    isDisqualified,
    examData.questionData,
    answeredQuestions,
    idTryout,
    subjectId,
    navigate
  ])

  // Jumlah total soal
  const totalQuestions = examData.questionData?.length || 0

  // Data soal saat ini
  const currentQuestionData = examData.questionData?.[currentQuestion - 1] || null

  // Find next unanswered question
  const findNextUnansweredQuestion = () => {
    for (let i = 1; i <= totalQuestions; i++) {
      if (!answeredQuestions.includes(i)) {
        return i
      }
    }
    return 1
  }

  // Fungsi untuk memilih atau menghapus jawaban
  const handleAnswerSelect = async (answerOptionId) => {
    try {
      const questionId = currentQuestionData.question_id
      const selected = selectedAnswers[questionId]
      const url = `/API/student/tryout/${idTryout}/${subjectId}/${questionId}/taking`

      // Jika klik jawaban yang sama, hapus jawaban dengan mengirim null
      if (selected === answerOptionId) {
        await axiosInstance.patch(url, { 
          answer_option_id: null,
          is_update: true 
        })
        setSelectedAnswers((prev) => {
          const newAnswers = { ...prev }
          delete newAnswers[questionId]
          localStorage.setItem(`tryout_${idTryout}_${subjectId}_answers`, JSON.stringify(newAnswers))
          return newAnswers
        })
        setAnsweredQuestions((prev) => {
          const newAnswered = prev.filter(id => id !== questionId)
          localStorage.setItem(`tryout_${idTryout}_${subjectId}_answered`, JSON.stringify(newAnswered))
          return newAnswered
        })
        return
      }

      // Cek apakah sudah pernah menjawab soal ini
      const alreadyAnswered = answeredQuestions.includes(questionId)

      if (alreadyAnswered) {
        await axiosInstance.patch(url, { 
          answer_option_id: answerOptionId,
          is_update: true 
        })
      } else {
        await axiosInstance.post(url, { 
          answerOptionId,
          is_update: false 
        })
      }

      // Update state setelah berhasil menyimpan
      setSelectedAnswers((prev) => {
        const newAnswers = { ...prev, [questionId]: answerOptionId }
        localStorage.setItem(`tryout_${idTryout}_${subjectId}_answers`, JSON.stringify(newAnswers))
        return newAnswers
      })
      
      // Pastikan questionId ada dalam answeredQuestions
      if (!answeredQuestions.includes(questionId)) {
        setAnsweredQuestions((prev) => {
          const newAnswered = [...prev, questionId]
          localStorage.setItem(`tryout_${idTryout}_${subjectId}_answered`, JSON.stringify(newAnswered))
          return newAnswered
        })
      }
    } catch (err) {
      console.error('Error menyimpan jawaban:', err)
      if (err.response) {
        const errorMessage = err.response.data?.message || 'Terjadi kesalahan saat menyimpan jawaban'
        alert(errorMessage)
      } else {
        alert('Gagal menyimpan jawaban. Silakan coba lagi.')
      }
    }
  }

  // Fungsi untuk submit jawaban kosong
  const submitEmptyAnswer = async (questionId) => {
    try {
      const url = `/API/student/tryout/${idTryout}/${subjectId}/${questionId}/taking`
      const alreadyAnswered = answeredQuestions.includes(questionId)

      if (alreadyAnswered) {
        await axiosInstance.delete(url)
      } else {
        await axiosInstance.post(url, { 
          answerOptionId: null 
        })
      }

      setSelectedAnswers((prev) => {
        const newAnswers = { ...prev }
        delete newAnswers[questionId]
        return newAnswers
      })
      
      setAnsweredQuestions((prev) => {
        if (!prev.includes(questionId)) {
          const newAnswered = [...prev, questionId]
          localStorage.setItem(`tryout_${idTryout}_${subjectId}_answered`, JSON.stringify(newAnswered))
          return newAnswered
        }
        return prev
      })
    } catch (err) {
      console.error('Error menyimpan jawaban kosong:', err)
    }
  }

  // Fungsi navigasi soal
  const navigateQuestion = async (direction) => {
    const questionId = currentQuestionData.question_id
    if (direction === "next") {
      if (!answeredQuestions.includes(questionId)) {
        await submitEmptyAnswer(questionId)
      }

      if (currentQuestion === totalQuestions) {
        if (timeLeft && (timeLeft.minutes > 0 || timeLeft.seconds > 0)) {
          const nextUnanswered = findNextUnansweredQuestion()
          setCurrentQuestion(nextUnanswered)
        } else {
          if (answeredQuestions.length === totalQuestions) {
            const currentSubjectId = Number(subjectId)
            const maxSubjectId = 7

            if (currentSubjectId < maxSubjectId) {
              const nextSubjectId = currentSubjectId + 1
              localStorage.removeItem(`tryout_${idTryout}_${subjectId}_time`)
              localStorage.removeItem(`tryout_${idTryout}_${subjectId}_answers`)
              localStorage.removeItem(`tryout_${idTryout}_${subjectId}_answered`)
              navigate(`/siswa/tryout/${idTryout}/${nextSubjectId}/peralihan`)
            } else {
              localStorage.removeItem(`tryout_${idTryout}_${subjectId}_time`)
              localStorage.removeItem(`tryout_${idTryout}_${subjectId}_answers`)
              localStorage.removeItem(`tryout_${idTryout}_${subjectId}_answered`)
              navigate(`/siswa/tryout/${idTryout}/penilaian`)
            }
          } else {
            const nextUnanswered = findNextUnansweredQuestion()
            setCurrentQuestion(nextUnanswered)
          }
        }
      } else {
        setCurrentQuestion((prev) => prev + 1)
      }
    } else if (direction === "prev") {
      setCurrentQuestion((prev) => Math.max(1, prev - 1))
    }
  }

  // Peringatan waktu (5 menit)
  const isTimeWarning = timeLeft?.minutes < 5

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#F5F0E9] to-[#EAE5DE]">
        <div className="text-xl font-semibold text-gray-700">Memuat...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#F5F0E9] to-[#EAE5DE]">
        <div className="text-xl font-semibold text-red-600">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-b from-[#F5F0E9] to-[#EAE5DE] flex flex-col items-center p-6 min-h-screen w-screen relative">
      <motion.div className="w-full max-w-6xl">
        <motion.div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <motion.div className="bg-gradient-to-br from-[#1E3A5F] to-[#2E4A7F] text-white p-6 rounded-xl shadow-lg w-full md:w-1/3">
            <motion.h2 className="text-xl font-bold text-center mb-6">
              Selamat Mengerjakan
            </motion.h2>

            {/* Status Pengawasan Anti-Cheat */}
            <div className="bg-[#2C4A6E] text-white p-4 rounded-xl mb-4 border border-[#3D6290]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <AlertTriangle
                    size={18}
                    className={
                      violationCount === 0
                        ? "text-emerald-400"
                        : violationCount === 1
                        ? "text-amber-400"
                        : "text-rose-400"
                    }
                  />
                  <span className="text-sm font-semibold">Pengawasan Ujian</span>
                </div>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    violationCount === 0
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : violationCount === 1
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  }`}
                >
                  {violationCount}/3 Pelanggaran
                </span>
              </div>
              <p className="text-xs text-blue-100 leading-relaxed">
                Tetap fokus pada halaman ini. Meninggalkan halaman sebanyak 3 kali akan mendiskualifikasi ujian secara otomatis.
              </p>
            </div>

            {timeLeft && (
              <motion.div className={`${
                isTimeWarning ? "bg-red-500" : "bg-[#2C4A6E]"
              } text-white text-center py-3 px-4 rounded-xl mb-4`}>
                <Clock className="inline-block mr-2" size={20} />
                <span className="text-xl font-bold">
                  {String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
                </span>
              </motion.div>
            )}

            <motion.div className="bg-[#2C4A6E] text-white text-center py-3 px-4 rounded-xl mb-4">
              <User className="inline-block mr-2" size={18} />
              <span>{examData.studentData?.nama || "Siswa"}</span>
              <div className="text-sm text-gray-300">NISN: {examData.studentData?.nisn}</div>
            </motion.div>

            <motion.div className="bg-[#2C4A6E] text-white text-center py-3 px-4 rounded-xl mb-4">
              <BookOpen className="inline-block mr-2" size={18} />
              <span>{examData.subjectData?.subjek}</span>
              <div className="text-sm text-gray-300">{examData.subjectData?.kategori_subjek}</div>
            </motion.div>

            <div className="grid grid-cols-5 gap-2 mt-4">
              {Array.from({ length: totalQuestions }, (_, i) => {
                const qId = examData.questionData[i]?.question_id
                return (
                  <motion.button
                    key={i}
                    onClick={() => setCurrentQuestion(i + 1)}
                    className={`p-2 rounded-lg cursor-pointer transition ${
                      currentQuestion === i + 1 ? "ring-2 ring-white" : ""
                    } ${
                      answeredQuestions.includes(qId)
                        ? "bg-green-500 hover:bg-green-600"
                        : "bg-[#2C4A6E] hover:bg-[#3D6290]"
                    }`}
                  >
                    {i + 1}
                  </motion.button>
                )
              })}
            </div>

            <div className="mt-4 bg-[#2C4A6E]/50 p-3 rounded-xl">
              <div className="flex justify-between text-sm">
                <span>Terjawab: {answeredQuestions.length}</span>
                <span>Sisa: {totalQuestions - answeredQuestions.length}</span>
              </div>
            </div>
          </motion.div>

          {/* Bagian Soal */}
          <motion.div className="bg-white p-6 rounded-xl shadow-lg w-full md:w-2/3">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">
                Soal {currentQuestion} dari {totalQuestions}
              </h3>
              {Boolean(currentQuestionData?.question_image || currentQuestionData?.image_question) && (
                <img 
                  src={
                    (() => {
                      const img = currentQuestionData.question_image || currentQuestionData.image_question;
                      return (img.startsWith('http://') || img.startsWith('https://'))
                        ? img
                        : `${axiosInstance.defaults.baseURL || ''}/images/questionImage/${img}`;
                    })()
                  } 
                  alt="Ilustrasi Soal" 
                  className="mb-4 rounded-lg max-w-full max-h-96 object-contain"
                />
              )}
              <p className="text-gray-700 whitespace-pre-wrap">
                {currentQuestionData?.question || "Pertanyaan tidak tersedia"}
              </p>
            </div>

            <div className="space-y-4 mt-6">
              {Array.isArray(currentQuestionData?.answer_options) && currentQuestionData.answer_options.length > 0 ? (
                currentQuestionData.answer_options.map((option) => (
                  <motion.button
                    key={option.answer_option_id || option.id}
                    onClick={() => handleAnswerSelect(option.answer_option_id || option.id)}
                    className={`w-full p-4 text-left rounded-xl cursor-pointer transition ${
                      selectedAnswers[currentQuestionData.question_id] === (option.answer_option_id || option.id)
                        ? "bg-green-500 text-white font-medium"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-800"
                    }`}
                  >
                    {option.text || option.answer_option}
                  </motion.button>
                ))
              ) : (
                <div className="text-gray-500 italic">Pilihan jawaban tidak tersedia</div>
              )}
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => navigateQuestion("prev")}
                disabled={currentQuestion === 1}
                className={`flex items-center min-h-[44px] px-5 py-2.5 rounded-xl font-medium cursor-pointer transition ${
                  currentQuestion === 1 ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-[#1E3A5F] hover:bg-[#2E4A7F] text-white"
                }`}
              >
                <ArrowLeft className="mr-2" size={16} />
                Sebelumnya
              </button>

              <button
                onClick={() => navigateQuestion("next")}
                className="flex items-center min-h-[44px] px-5 py-2.5 rounded-xl font-medium bg-[#1E3A5F] hover:bg-[#2E4A7F] text-white cursor-pointer transition"
              >
                {currentQuestion === totalQuestions ? "Selesai" : "Selanjutnya"}
                <ArrowRight className="ml-2" size={16} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Modal Peringatan Pelanggaran (1 & 2) */}
      {showWarningModal && !isDisqualified && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border-2 border-amber-500 text-gray-800"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-full flex-shrink-0">
                <AlertTriangle size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {violationCount === 1 ? "Peringatan Pertama" : "Peringatan Terakhir"}
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  Pelanggaran {violationCount} dari 3
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              {violationCount === 1
                ? "Anda terdeteksi meninggalkan halaman ujian (berpindah tab atau membuka jendela lain). Tetap berada di halaman ini selama ujian berlangsung."
                : "Anda kembali meninggalkan halaman ujian. Jika Anda meninggalkan halaman ujian satu kali lagi, sesi ujian akan langsung dihentikan dan didiskualifikasi dengan nilai 0."}
            </p>
            <button
              onClick={() => setShowWarningModal(false)}
              className="w-full min-h-[44px] py-3 px-4 bg-[#1E3A5F] hover:bg-[#2E4A7F] text-white font-medium rounded-xl transition cursor-pointer shadow-md focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:ring-offset-2"
            >
              Saya Mengerti dan Kembali ke Ujian
            </button>
          </motion.div>
        </div>
      )}

      {/* Modal Diskualifikasi Otomatis (Pelanggaran ke-3) */}
      {isDisqualified && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border-2 border-rose-600 text-gray-800 text-center"
          >
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert size={36} />
            </div>
            <h3 className="text-xl font-bold text-rose-600 mb-2">
              Ujian Didiskualifikasi
            </h3>
            <div className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-rose-100 text-rose-800 mb-4">
              Batas Pelanggaran Terlampaui (3/3)
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              Anda telah meninggalkan halaman ujian sebanyak 3 kali. Sesuai integritas sistem UTBK-SNBT, sesi ujian telah dihentikan secara otomatis dan perolehan nilai disetel menjadi 0.
            </p>
            <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 mb-6">
              {isSubmittingDisqualify ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                  Menyimpan catatan diskualifikasi...
                </span>
              ) : (
                "Mengalihkan otomatis ke halaman hasil tryout..."
              )}
            </div>
            <button
              onClick={() => navigate(`/siswa/tryout/${idTryout}/hasil`, { replace: true })}
              disabled={isSubmittingDisqualify}
              className="w-full min-h-[44px] py-3 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-medium rounded-xl transition cursor-pointer shadow-md focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
            >
              Lihat Hasil Ujian
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
