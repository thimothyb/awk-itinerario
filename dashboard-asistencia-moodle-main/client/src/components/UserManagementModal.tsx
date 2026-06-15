import { useState, useEffect } from 'react';
import { Modal, Button, Table, Form, Badge, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';

interface AppUser {
    username: string;
    name: string;
    role: 'admin' | 'viewer';
}

interface Props {
    show: boolean;
    onHide: () => void;
    currentUsername: string;
}

export function UserManagementModal({ show, onHide, currentUsername }: Props) {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState<'admin' | 'viewer'>('viewer');
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const loadUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await axios.get('/api/auth/users');
            if (res.data.ok) setUsers(res.data.users);
        } catch {
            setError('Error cargando usuarios');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (show) loadUsers();
    }, [show]);

    const handleCreate = async () => {
        if (!newUsername.trim() || !newPassword.trim() || !newName.trim()) {
            setFormError('Todos los campos son obligatorios');
            return;
        }
        setSaving(true);
        setFormError('');
        try {
            await axios.post('/api/auth/users', {
                username: newUsername.trim(),
                password: newPassword.trim(),
                name: newName.trim(),
                role: newRole
            });
            setNewUsername('');
            setNewPassword('');
            setNewName('');
            setNewRole('viewer');
            loadUsers();
        } catch (err: any) {
            setFormError(err.response?.data?.error || 'Error creando usuario');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (username: string) => {
        if (!window.confirm(`¿Eliminar el usuario "${username}"?`)) return;
        try {
            await axios.delete(`/api/auth/users/${username}`);
            loadUsers();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Error eliminando usuario');
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title>
                    <i className="fa-solid fa-users-gear me-2"></i>Gestión de Usuarios
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">

                {/* Lista de usuarios */}
                <h6 className="fw-bold mb-3">Usuarios existentes</h6>
                {loading && <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>}
                {error && <Alert variant="danger">{error}</Alert>}
                {!loading && !error && (
                    <Table hover responsive className="align-middle mb-4">
                        <thead className="bg-light">
                            <tr>
                                <th>Usuario</th>
                                <th>Nombre</th>
                                <th>Rol</th>
                                <th className="text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.username}>
                                    <td className="fw-bold">{u.username}</td>
                                    <td>{u.name}</td>
                                    <td>
                                        <Badge bg={u.role === 'admin' ? 'danger' : 'secondary'}>
                                            {u.role === 'admin' ? 'Admin' : 'Visor'}
                                        </Badge>
                                    </td>
                                    <td className="text-center">
                                        {u.username !== 'admin' && u.username !== currentUsername ? (
                                            <Button variant="outline-danger" size="sm" onClick={() => handleDelete(u.username)}>
                                                <i className="fa-solid fa-trash"></i>
                                            </Button>
                                        ) : (
                                            <span className="text-muted small">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}

                {/* Formulario nuevo usuario */}
                <h6 className="fw-bold mb-3 border-top pt-3">Crear nuevo usuario</h6>
                {formError && <Alert variant="danger" className="small">{formError}</Alert>}
                <div className="row g-2">
                    <div className="col-md-3">
                        <Form.Control
                            size="sm"
                            placeholder="Usuario"
                            value={newUsername}
                            onChange={e => setNewUsername(e.target.value)}
                        />
                    </div>
                    <div className="col-md-3">
                        <Form.Control
                            size="sm"
                            type="password"
                            placeholder="Contraseña"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                        />
                    </div>
                    <div className="col-md-3">
                        <Form.Control
                            size="sm"
                            placeholder="Nombre completo"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                        />
                    </div>
                    <div className="col-md-2">
                        <Form.Select size="sm" value={newRole} onChange={e => setNewRole(e.target.value as any)}>
                            <option value="viewer">Visor</option>
                            <option value="admin">Admin</option>
                        </Form.Select>
                    </div>
                    <div className="col-md-1">
                        <Button variant="success" size="sm" className="w-100" onClick={handleCreate} disabled={saving}>
                            {saving ? <Spinner size="sm" /> : <i className="fa-solid fa-plus"></i>}
                        </Button>
                    </div>
                </div>
                <Form.Text className="text-muted">
                    <strong>Visor:</strong> solo puede ver cursos y generar reportes. No puede agregar cursos ni cambiar el orden.
                </Form.Text>

            </Modal.Body>
        </Modal>
    );
}
