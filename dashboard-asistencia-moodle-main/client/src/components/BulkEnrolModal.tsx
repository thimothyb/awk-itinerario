import { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button, Form, Table, Spinner, Alert, Badge } from 'react-bootstrap';

interface MoodleCourse {
    id: number;
    shortname: string;
    fullname: string;
}

interface MoodleUser {
    id: number;
    fullname: string;
    email: string;
    roles: string;
}

interface BulkEnrolModalProps {
    show: boolean;
    onHide: () => void;
    destCourse: { courseId: number; shortname: string; fullname: string } | null;
}

export function BulkEnrolModal({ show, onHide, destCourse }: BulkEnrolModalProps) {
    // Step 1: Select source course
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [moodleCourses, setMoodleCourses] = useState<MoodleCourse[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(false);
    const [sourceCourseId, setSourceCourseId] = useState<number | ''>('');
    const [searchTerm, setSearchTerm] = useState('');

    // Step 2: Select users
    const [users, setUsers] = useState<MoodleUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
    const [alreadyEnrolledIds, setAlreadyEnrolledIds] = useState<Set<number>>(new Set());

    // Step 3: Enrol results
    const [enrolling, setEnrolling] = useState(false);
    const [sendWelcome, setSendWelcome] = useState(true); // checkbox marcado por defecto
    const [results, setResults] = useState<{ success: number; skipped: number; total: number } | null>(null);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [welcomeResult, setWelcomeResult] = useState<'sent' | 'error' | ''>('');

    // Load courses when modal opens
    useEffect(() => {
        if (show && destCourse) {
            setStep(1);
            setSourceCourseId('');
            setSearchTerm('');
            setUsers([]);
            setSelectedUserIds(new Set());
            setAlreadyEnrolledIds(new Set());
            setResults(null);
            setWarnings([]);
            setError('');
            setSendWelcome(true);
            setWelcomeResult('');
            loadMoodleCourses(destCourse.courseId);
        }
    }, [show, destCourse]);

    const loadMoodleCourses = async (contextCourseId: number) => {
        setLoadingCourses(true);
        try {
            const res = await axios.get('/api/moodle/courses', {
                params: { courseId: contextCourseId }
            });
            if (res.data.ok) {
                setMoodleCourses(res.data.courses);
            }
        } catch (err) {
            console.error('Error cargando cursos:', err);
            setError('Error al cargar la lista de cursos de Moodle');
        } finally {
            setLoadingCourses(false);
        }
    };

    const handleLoadUsers = async () => {
        if (!sourceCourseId || !destCourse) return;
        setLoadingUsers(true);
        setError('');
        try {
            // Cargar alumnos del curso origen Y del curso destino en paralelo
            const [sourceRes, destRes] = await Promise.all([
                axios.get(`/api/moodle/enrolled-users/${sourceCourseId}`, {
                    params: { contextCourseId: destCourse.courseId }
                }),
                axios.get(`/api/moodle/enrolled-users/${destCourse.courseId}`, {
                    params: { contextCourseId: destCourse.courseId }
                })
            ]);

            if (sourceRes.data.ok) {
                setUsers(sourceRes.data.users);
                setSelectedUserIds(new Set());

                // Guardar IDs de usuarios ya inscritos en el destino
                const enrolledIds = new Set<number>();
                if (destRes.data.ok && Array.isArray(destRes.data.users)) {
                    destRes.data.users.forEach((u: MoodleUser) => enrolledIds.add(u.id));
                }
                setAlreadyEnrolledIds(enrolledIds);

                setStep(2);
            }
        } catch (err) {
            console.error('Error cargando usuarios:', err);
            setError('Error al cargar los alumnos del curso');
        } finally {
            setLoadingUsers(false);
        }
    };

    const toggleUser = (userId: number) => {
        if (alreadyEnrolledIds.has(userId)) return; // bloqueado
        setSelectedUserIds(prev => {
            const next = new Set(prev);
            if (next.has(userId)) {
                next.delete(userId);
            } else {
                next.add(userId);
            }
            return next;
        });
    };

    const toggleAll = () => {
        const enrollable = users.filter(u => !alreadyEnrolledIds.has(u.id));
        if (selectedUserIds.size === enrollable.length) {
            setSelectedUserIds(new Set());
        } else {
            setSelectedUserIds(new Set(enrollable.map(u => u.id)));
        }
    };

    const handleEnrol = async () => {
        const toEnrol = Array.from(selectedUserIds).filter(id => !alreadyEnrolledIds.has(id));
        if (toEnrol.length === 0) {
            setError("No hay alumnos nuevos seleccionados para inscribir.");
            return;
        }

        if (!destCourse) return;
        setEnrolling(true);
        setError('');
        setWelcomeResult('');
        setWarnings([]);
        try {
            const res = await axios.post('/api/moodle/bulk-enrol', {
                destCourseId: destCourse.courseId,
                userIds: toEnrol
            });
            if (res.data.ok) {
                setResults(res.data.results);
                if (res.data.warnings) {
                    setWarnings(res.data.warnings);
                }

                // Enviar mensaje de bienvenida automáticamente si el check está activado
                if (sendWelcome && res.data.results.success > 0) {
                    try {
                        await axios.post('/api/moodle/send-welcome', {
                            courseId: destCourse.courseId,
                            courseName: destCourse.fullname,
                            userIds: toEnrol
                        });
                        setWelcomeResult('sent');
                    } catch (welcomeErr) {
                        console.error('Error enviando bienvenida:', welcomeErr);
                        setWelcomeResult('error');
                    }
                }

                setStep(3);
            } else {
                setError(res.data.error || 'Error al inscribir');
            }
        } catch (err: any) {
            console.error('Error en inscripción:', err);
            setError(err.response?.data?.error || 'Error al inscribir usuarios');
        } finally {
            setEnrolling(false);
        }
    };

    const filteredCourses = moodleCourses.filter(c => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return c.fullname.toLowerCase().includes(term) || c.shortname.toLowerCase().includes(term);
    });

    const sourceCourseName = moodleCourses.find(c => c.id === sourceCourseId);
    const enrollableCount = Array.from(selectedUserIds).filter(id => !alreadyEnrolledIds.has(id)).length;

    return (
        <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
            <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <Modal.Title className="text-white" style={{ fontSize: '1.1rem' }}>
                    <i className="fa-solid fa-user-plus me-2"></i>
                    Inscripción Masiva → {destCourse?.shortname || ''}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="p-4">
                {error && (
                    <Alert variant="danger" dismissible onClose={() => setError('')}>
                        <i className="fa-solid fa-circle-exclamation me-2"></i>{error}
                    </Alert>
                )}

                {/* ========== STEP 1: Select Source Course ========== */}
                {step === 1 && (
                    <div>
                        <h6 className="fw-bold mb-3">
                            <Badge bg="primary" className="me-2">1</Badge>
                            Seleccionar Curso Origen
                        </h6>
                        <p className="text-muted small mb-3">
                            Elige el curso de donde se tomarán los alumnos para inscribirlos en <strong>{destCourse?.fullname}</strong>
                        </p>

                        {loadingCourses ? (
                            <div className="text-center py-4">
                                <Spinner animation="border" variant="primary" />
                                <p className="text-muted mt-2">Cargando cursos de Moodle...</p>
                            </div>
                        ) : (
                            <>
                                <Form.Control
                                    type="text"
                                    placeholder="🔍 Buscar curso por nombre..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="mb-3"
                                    style={{ borderRadius: '10px' }}
                                    autoFocus
                                />

                                <div style={{
                                    maxHeight: '300px', overflowY: 'auto',
                                    border: '1px solid #e5e7eb', borderRadius: '10px'
                                }}>
                                    {filteredCourses.map(course => (
                                        <div
                                            key={course.id}
                                            onClick={() => setSourceCourseId(course.id)}
                                            style={{
                                                padding: '12px 16px',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #f3f4f6',
                                                backgroundColor: sourceCourseId === course.id ? '#eef2ff' : 'white',
                                                borderLeft: sourceCourseId === course.id ? '4px solid #4f46e5' : '4px solid transparent',
                                                transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (sourceCourseId !== course.id) e.currentTarget.style.backgroundColor = '#f9fafb';
                                            }}
                                            onMouseLeave={(e) => {
                                                if (sourceCourseId !== course.id) e.currentTarget.style.backgroundColor = 'white';
                                            }}
                                        >
                                            <div className="fw-bold" style={{ fontSize: '0.9rem' }}>
                                                {sourceCourseId === course.id && <i className="fa-solid fa-circle-check text-primary me-2"></i>}
                                                {course.shortname}
                                            </div>
                                            <div className="text-muted" style={{ fontSize: '0.8rem' }}>{course.fullname}</div>
                                        </div>
                                    ))}
                                    {filteredCourses.length === 0 && (
                                        <div className="text-center py-4 text-muted">No se encontraron cursos</div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ========== STEP 2: Select Users ========== */}
                {step === 2 && (
                    <div>
                        <h6 className="fw-bold mb-3">
                            <Badge bg="primary" className="me-2">2</Badge>
                            Seleccionar Alumnos de: <span className="text-primary">{sourceCourseName?.shortname}</span>
                        </h6>

                        {loadingUsers ? (
                            <div className="text-center py-4">
                                <Spinner animation="border" variant="primary" />
                                <p className="text-muted mt-2">Cargando alumnos...</p>
                            </div>
                        ) : users.length === 0 ? (
                            <Alert variant="warning">
                                <i className="fa-solid fa-user-slash me-2"></i>
                                No se encontraron alumnos en este curso.
                            </Alert>
                        ) : (
                            <>
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <span className="text-muted small">
                                        {selectedUserIds.size} de {users.filter(u => !alreadyEnrolledIds.has(u.id)).length} disponibles
                                        {users.filter(u => alreadyEnrolledIds.has(u.id)).length > 0 && (
                                            <span className="text-warning ms-2">
                                                <i className="fa-solid fa-lock me-1" style={{ fontSize: '0.7rem' }}></i>
                                                {users.filter(u => alreadyEnrolledIds.has(u.id)).length} ya inscritos
                                            </span>
                                        )}
                                    </span>
                                    <Button variant="outline-primary" size="sm" onClick={toggleAll}>
                                        {selectedUserIds.size === users.filter(u => !alreadyEnrolledIds.has(u.id)).length && selectedUserIds.size > 0
                                            ? 'Deseleccionar Todos'
                                            : 'Seleccionar Todos'}
                                    </Button>
                                </div>

                                <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
                                    <Table hover className="mb-0" style={{ fontSize: '0.9rem' }}>
                                        <thead style={{ position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 1 }}>
                                            <tr>
                                                <th style={{ width: '40px' }}></th>
                                                <th>Nombre</th>
                                                <th>Email</th>
                                                <th>Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map(user => {
                                                const isBlocked = alreadyEnrolledIds.has(user.id);
                                                return (
                                                    <tr
                                                        key={user.id}
                                                        onClick={() => toggleUser(user.id)}
                                                        style={{
                                                            cursor: isBlocked ? 'not-allowed' : 'pointer',
                                                            backgroundColor: isBlocked ? '#fff8f0' : selectedUserIds.has(user.id) ? '#eef2ff' : undefined,
                                                            opacity: isBlocked ? 0.55 : 1,
                                                        }}
                                                    >
                                                        <td className="text-center">
                                                            <Form.Check
                                                                type="checkbox"
                                                                checked={selectedUserIds.has(user.id)}
                                                                onChange={() => toggleUser(user.id)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                disabled={isBlocked}
                                                            />
                                                        </td>
                                                        <td className={isBlocked ? 'text-muted' : 'fw-semibold'}>
                                                            {isBlocked && <i className="fa-solid fa-lock text-warning me-2" style={{ fontSize: '0.75rem' }}></i>}
                                                            {user.fullname}
                                                        </td>
                                                        <td className="text-muted">{user.email}</td>
                                                        <td>
                                                            {isBlocked ? (
                                                                <Badge bg="warning" text="dark" style={{ fontSize: '0.7rem' }}>Ya inscrito</Badge>
                                                            ) : (
                                                                <Badge bg="secondary" style={{ fontSize: '0.7rem' }}>{user.roles || 'student'}</Badge>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </Table>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ========== STEP 3: Results ========== */}
                {step === 3 && results && (
                    <div className="text-center py-4">
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                            {results.success > 0 ? '🎉' : '⚠️'}
                        </div>
                        <h5 className="fw-bold mb-4">Inscripción Completada</h5>

                        <div className="d-flex justify-content-center gap-4 mb-4">
                            <div className="text-center">
                                <div className="fw-bold fs-3 text-success">{results.success}</div>
                                <small className="text-muted">Inscritos</small>
                            </div>
                            {(results.skipped || 0) > 0 && (
                                <div className="text-center">
                                    <div className="fw-bold fs-3 text-warning">{results.skipped}</div>
                                    <small className="text-muted">Ya inscritos</small>
                                </div>
                            )}
                            <div className="text-center">
                                <div className="fw-bold fs-3 text-secondary">{results.total}</div>
                                <small className="text-muted">Total</small>
                            </div>
                        </div>

                        {warnings.length > 0 && (
                            <Alert variant="info" className="text-start" style={{ fontSize: '0.85rem' }}>
                                <i className="fa-solid fa-info-circle me-2"></i>
                                <strong>Nota:</strong> Los alumnos fueron inscritos correctamente, pero Moodle reportó advertencias menores
                                (ej: correo de notificación no enviado). Esto no afecta la inscripción.
                            </Alert>
                        )}

                        <p className="text-muted small">
                            Los alumnos fueron inscritos exitosamente en <strong>{destCourse?.fullname}</strong>
                        </p>

                        {welcomeResult === 'sent' && (
                            <Alert variant="success" className="text-start" style={{ fontSize: '0.85rem' }}>
                                <i className="fa-solid fa-envelope-circle-check me-2"></i>
                                Se enviaron mensajes de bienvenida a los alumnos inscritos.
                            </Alert>
                        )}
                        {welcomeResult === 'error' && (
                            <Alert variant="warning" className="text-start" style={{ fontSize: '0.85rem' }}>
                                <i className="fa-solid fa-triangle-exclamation me-2"></i>
                                Los alumnos fueron inscritos, pero no se pudieron enviar los mensajes de bienvenida.
                            </Alert>
                        )}
                    </div>
                )}
            </Modal.Body>

            <Modal.Footer className="d-flex justify-content-between">
                {step === 1 && (
                    <>
                        <Button variant="light" onClick={onHide}>Cancelar</Button>
                        <Button
                            variant="primary"
                            onClick={handleLoadUsers}
                            disabled={!sourceCourseId || loadingUsers}
                        >
                            {loadingUsers ? (
                                <><Spinner as="span" animation="border" size="sm" className="me-2" />Cargando...</>
                            ) : (
                                <><i className="fa-solid fa-arrow-right me-2"></i>Ver Alumnos</>
                            )}
                        </Button>
                    </>
                )}

                {step === 2 && (
                    <>
                        <Button variant="light" onClick={() => setStep(1)}>
                            <i className="fa-solid fa-arrow-left me-2"></i>Volver
                        </Button>
                        <div className="d-flex align-items-center gap-3">
                            <Form.Check
                                type="checkbox"
                                id="send-welcome-check"
                                label={
                                    <span style={{ fontSize: '0.85rem' }}>
                                        <i className="fa-solid fa-envelope me-1"></i>
                                        Enviar mensaje de Bienvenida
                                    </span>
                                }
                                checked={sendWelcome}
                                onChange={(e) => setSendWelcome(e.target.checked)}
                            />
                            <Button
                                className="btn-enrol"
                                onClick={handleEnrol}
                                disabled={enrollableCount === 0 || enrolling}
                            >
                                {enrolling ? (
                                    <><Spinner as="span" animation="border" size="sm" className="me-2" />Inscribiendo...</>
                                ) : (
                                    <><i className="fa-solid fa-user-plus me-2"></i>Inscribir {enrollableCount} Alumno(s)</>
                                )}
                            </Button>
                        </div>
                    </>
                )}

                {step === 3 && (
                    <Button variant="primary" onClick={onHide} className="ms-auto">
                        <i className="fa-solid fa-check me-2"></i>Cerrar
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    );
}
