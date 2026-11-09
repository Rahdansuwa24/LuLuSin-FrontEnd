import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';

// CSS-in-JS styles
const styles = {
  transitionContainer: {
    display: 'flex',
    height: '100vh',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e3351 0%, #1a2a40 100%)',
    position: 'relative',
    overflow: 'hidden'
  },

  bgParticles: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden'
  },

  card: {
    padding: '2.5rem',
    borderRadius: '1rem',
    backgroundColor: 'rgba(42, 60, 87, 0.6)',
    backdropFilter: 'blur(10px)',
    width: '500px',
    maxWidth: '90%',
    textAlign: 'center',
    zIndex: 10,
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.15)'
  },

  title: {
    fontSize: '1.75rem',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '1.25rem'
  },

  timerLabel: {
    color: '#93c5fd',
    fontSize: '0.875rem',
    marginBottom: '0.5rem'
  },

  timerValue: {
    color: 'white',
    fontSize: '2rem',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    backgroundColor: '#1e3351',
    padding: '0.5rem 1.5rem',
    borderRadius: '0.5rem',
    display: 'inline-block',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  },

  button: {
    backgroundColor: '#ffffff',
    color: '#1e3351',
    padding: '0.75rem 2rem',
    borderRadius: '0.75rem',
    fontWeight: '600',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    border: 'none',
    minHeight: '44px'
  }
};

const Peralihan = () => {
  const [timeLeft, setTimeLeft] = useState(5);
  const [subjectList, setSubjectList] = useState([]);
  const [nextSubjectDetail, setNextSubjectDetail] = useState(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const navigate = useNavigate();
  const { id: idTryout, subjectId } = useParams();
  
  // Ambil daftar subjek saat mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await axiosInstance.get(`/API/student/tryout/${idTryout}`);
        let subjects = res.data.getTryout?.subjects;
        if (typeof subjects === 'string') {
          subjects = JSON.parse(subjects);
        }
        
        if (Array.isArray(subjects)) {
          subjects.sort((a, b) => Number(a.subject_id) - Number(b.subject_id));
          setSubjectList(subjects);
        } else {
          setSubjectList([]);
        }
      } catch (err) {
        console.error('Error mengambil data mata pelajaran:', err);
        setSubjectList([]);
      }
    };
    fetchSubjects();
  }, [idTryout]);

  // Ambil detail subjek tujuan (berikutnya)
  useEffect(() => {
    if (subjectList.length > 0) {
      const targetSubject = subjectList.find(s => String(s.subject_id) === String(subjectId));
      setNextSubjectDetail(targetSubject || null);
    }
  }, [subjectList, subjectId]);

  // Fungsi untuk finalisasi tryout saat subtes habis
  const finalizeTryout = async () => {
    try {
      setIsFinalizing(true);
      await axiosInstance.post(`/API/student/tryout/${idTryout}/finalize`);
      navigate(`/siswa/tryout/${idTryout}/penilaian`);
    } catch (error) {
      console.error('Error finalisasi tryout:', error);
      navigate(`/siswa/tryout/${idTryout}/penilaian`);
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleStartNow = () => {
    const targetSubject = subjectList.find(s => String(s.subject_id) === String(subjectId));
    if (targetSubject) {
      navigate(`/siswa/tryout/${idTryout}/${targetSubject.subject_id}/pengerjaan`);
    } else {
      finalizeTryout();
    }
  };

  // Efek untuk navigasi otomatis ketika countdown habis
  useEffect(() => {
    if (timeLeft === 0 && subjectList.length > 0) {
      const targetSubject = subjectList.find(s => String(s.subject_id) === String(subjectId));
      if (targetSubject) {
        navigate(`/siswa/tryout/${idTryout}/${targetSubject.subject_id}/pengerjaan`);
      } else {
        finalizeTryout();
      }
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, subjectList, subjectId, idTryout, navigate]);

  const formatTime = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div style={styles.transitionContainer}>
      {/* Background animation elements */}
      <div style={styles.bgParticles}>
        <AnimatePresence>
          {Array.from({ length: 15 }).map((_, index) => (
            <motion.div
              key={index}
              initial={{ 
                opacity: 0, 
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800), 
                y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 600)
              }}
              animate={{ 
                opacity: [0, 0.2, 0],
                y: [null, -100]
              }}
              transition={{ 
                duration: 6,
                repeat: Infinity,
                delay: index * 0.4
              }}
              style={{
                position: 'absolute',
                borderRadius: '9999px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                width: 40 + (index * 4),
                height: 40 + (index * 4)
              }}
            />
          ))}
        </AnimatePresence>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={styles.card}
      >
        <motion.h1 style={styles.title}>
          {nextSubjectDetail
            ? `Subtes Berikutnya`
            : isFinalizing
            ? 'Menyelesaikan Tryout...'
            : 'Sesi Terakhir Selesai'}
        </motion.h1>

        <div style={{ color: 'white', fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 600 }}>
          {nextSubjectDetail ? (
            <span className="text-[#d9c5a0]">{nextSubjectDetail.subject_name || nextSubjectDetail.subjek}</span>
          ) : (
            <span>Menghitung perolehan nilai tryout...</span>
          )}
        </div>
        
        <div style={{ marginBottom: '2rem' }}>
          <p style={styles.timerLabel}>
            {nextSubjectDetail ? 'Dimulai otomatis dalam:' : 'Memproses...'}
          </p>
          {nextSubjectDetail && (
            <div style={styles.timerValue}>
              {formatTime()}
            </div>
          )}
        </div>

        {nextSubjectDetail && (
          <button
            onClick={handleStartNow}
            style={styles.button}
            className="hover:bg-gray-100 transition shadow-md active:scale-95"
          >
            Mulai Sekarang
          </button>
        )}
      </motion.div>
    </div>
  );
};

export default Peralihan;
