import React from 'react';

const PlayerList = ({ players, onEdit, onDelete }) => {
    const calculateAge = (birthDate) => {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    if (players.length === 0) {
        return (
            <div className="text-center py-4">
                <p className="text-muted">Nincsenek játékosok</p>
            </div>
        );
    }

    return (
        <div className="table-responsive">
            <table className="table table-striped table-hover">
                <thead className="table-dark">
                    <tr>
                        <th>Név</th>
                        <th>Kor</th>
                        <th>Pozíció</th>
                        <th>Domináns láb</th>
                        <th>Csapat</th>
                        <th>Szülő</th>
                        <th>Telefon</th>
                        <th>Műveletek</th>
                    </tr>
                </thead>
                <tbody>
                    {players.map(player => (
                        <tr key={player.id}>
                            <td>
                                <strong>{player.name}</strong>
                            </td>
                            <td>
                                <span className="badge bg-secondary">
                                    {calculateAge(player.birth_date)} év
                                </span>
                            </td>
                            <td>{player.position || '-'}</td>
                            <td>{player.dominant_foot || '-'}</td>
                            <td>
                                {player.team_name ? (
                                    <span className="badge bg-primary">{player.team_name}</span>
                                ) : (
                                    <span className="text-muted">Nincs csapat</span>
                                )}
                            </td>
                            <td>{player.parent_name || '-'}</td>
                            <td>
                                {player.parent_phone ? (
                                    <a href={`tel:${player.parent_phone}`} className="text-decoration-none">
                                        {player.parent_phone}
                                    </a>
                                ) : '-'}
                            </td>
                            <td>
                                <div className="btn-group" role="group">
                                    <button 
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={() => onEdit(player)}
                                        title="Szerkesztés"
                                    >
                                        ✏️
                                    </button>
                                    <button 
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => onDelete(player.id)}
                                        title="Törlés"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default PlayerList;