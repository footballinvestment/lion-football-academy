import React from 'react';
import '../styles/mobile.css';

const ResponsiveTable = ({ 
    columns, 
    data, 
    actions,
    emptyMessage = "Nincs megjeleníthető adat",
    className = "",
    mobileCardView = true 
}) => {
    const renderDesktopTable = () => (
        <div className={`table-responsive ${mobileCardView ? 'mobile-card-table' : ''}`}>
            <table className={`table table-hover ${className}`}>
                <thead className="table-light">
                    <tr>
                        {columns.map((column, index) => (
                            <th key={index} scope="col" className={column.className || ''}>
                                {column.header}
                            </th>
                        ))}
                        {actions && actions.length > 0 && (
                            <th scope="col" className="text-end">Műveletek</th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length + (actions ? 1 : 0)} className="text-center text-muted py-4">
                                <i className="fas fa-inbox me-2"></i>
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {columns.map((column, colIndex) => (
                                    <td 
                                        key={colIndex} 
                                        className={column.className || ''}
                                        data-label={column.header}
                                    >
                                        {column.render ? column.render(row, rowIndex) : row[column.key]}
                                    </td>
                                ))}
                                {actions && actions.length > 0 && (
                                    <td className="text-end" data-label="Műveletek">
                                        <div className="btn-group" role="group">
                                            {actions.map((action, actionIndex) => (
                                                <button
                                                    key={actionIndex}
                                                    type="button"
                                                    className={`btn ${action.className || 'btn-outline-secondary'} btn-sm`}
                                                    onClick={() => action.onClick(row, rowIndex)}
                                                    disabled={action.disabled ? action.disabled(row) : false}
                                                    title={action.title || action.label}
                                                >
                                                    {action.icon && <i className={`${action.icon} me-1`}></i>}
                                                    {action.label}
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );

    const renderMobileCards = () => (
        <div className={`mobile-card-view ${mobileCardView ? '' : 'd-none'}`}>
            {data.length === 0 ? (
                <div className="text-center text-muted py-5">
                    <i className="fas fa-inbox fa-3x mb-3"></i>
                    <p>{emptyMessage}</p>
                </div>
            ) : (
                data.map((row, rowIndex) => (
                    <div key={rowIndex} className="mobile-card">
                        <div className="mobile-card-header">
                            <div className="mobile-card-title">
                                {columns[0].render ? columns[0].render(row, rowIndex) : row[columns[0].key]}
                            </div>
                            {actions && actions.length > 0 && (
                                <div className="dropdown">
                                    <button 
                                        className="btn btn-outline-secondary btn-sm dropdown-toggle" 
                                        type="button" 
                                        data-bs-toggle="dropdown"
                                        aria-expanded="false"
                                    >
                                        <i className="fas fa-ellipsis-v"></i>
                                    </button>
                                    <ul className="dropdown-menu dropdown-menu-end">
                                        {actions.map((action, actionIndex) => (
                                            <li key={actionIndex}>
                                                <button
                                                    className="dropdown-item"
                                                    onClick={() => action.onClick(row, rowIndex)}
                                                    disabled={action.disabled ? action.disabled(row) : false}
                                                >
                                                    {action.icon && <i className={`${action.icon} me-2`}></i>}
                                                    {action.label}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                        <div className="mobile-card-body">
                            {columns.slice(1).map((column, colIndex) => (
                                <div key={colIndex} className="row mb-2">
                                    <div className="col-5 mobile-card-label">
                                        {column.header}:
                                    </div>
                                    <div className="col-7 mobile-card-value">
                                        {column.render ? column.render(row, rowIndex) : row[column.key]}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {actions && actions.length > 0 && (
                            <div className="mobile-card-actions d-flex d-md-none">
                                {actions.slice(0, 2).map((action, actionIndex) => (
                                    <button
                                        key={actionIndex}
                                        type="button"
                                        className={`btn ${action.className || 'btn-outline-secondary'} btn-sm me-2`}
                                        onClick={() => action.onClick(row, rowIndex)}
                                        disabled={action.disabled ? action.disabled(row) : false}
                                    >
                                        {action.icon && <i className={`${action.icon} me-1`}></i>}
                                        {action.label}
                                    </button>
                                ))}
                                {actions.length > 2 && (
                                    <div className="dropdown">
                                        <button 
                                            className="btn btn-outline-secondary btn-sm dropdown-toggle" 
                                            type="button" 
                                            data-bs-toggle="dropdown"
                                        >
                                            Több
                                        </button>
                                        <ul className="dropdown-menu">
                                            {actions.slice(2).map((action, actionIndex) => (
                                                <li key={actionIndex + 2}>
                                                    <button
                                                        className="dropdown-item"
                                                        onClick={() => action.onClick(row, rowIndex)}
                                                        disabled={action.disabled ? action.disabled(row) : false}
                                                    >
                                                        {action.icon && <i className={`${action.icon} me-2`}></i>}
                                                        {action.label}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );

    return (
        <div className="responsive-table-container">
            {renderDesktopTable()}
            {mobileCardView && renderMobileCards()}
        </div>
    );
};

// Quick helper for common table configurations
export const createPlayerTableConfig = (onEdit, onDelete) => ({
    columns: [
        {
            header: 'Név',
            key: 'name',
            render: (player) => (
                <div className="d-flex align-items-center">
                    <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" 
                         style={{ width: '32px', height: '32px', fontSize: '14px' }}>
                        {player.name?.charAt(0) || '?'}
                    </div>
                    <div>
                        <div className="fw-medium">{player.name}</div>
                        <small className="text-muted">{player.position || 'Nincs pozíció'}</small>
                    </div>
                </div>
            )
        },
        {
            header: 'Születési dátum',
            key: 'birth_date',
            render: (player) => {
                if (!player.birth_date) return '-';
                const date = new Date(player.birth_date);
                const age = Math.floor((Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                return (
                    <div>
                        <div>{date.toLocaleDateString('hu-HU')}</div>
                        <small className="text-muted">{age} éves</small>
                    </div>
                );
            }
        },
        {
            header: 'Csapat',
            key: 'team_name',
            render: (player) => player.team_name ? (
                <span className="badge bg-info">{player.team_name}</span>
            ) : (
                <span className="text-muted">Nincs csapat</span>
            )
        },
        {
            header: 'Domináns láb',
            key: 'dominant_foot',
            render: (player) => player.dominant_foot ? (
                <span className={`badge ${player.dominant_foot === 'jobb' ? 'bg-success' : 'bg-warning'}`}>
                    {player.dominant_foot}
                </span>
            ) : '-'
        }
    ],
    actions: [
        {
            label: 'Szerkesztés',
            icon: 'fas fa-edit',
            className: 'btn-outline-primary',
            onClick: onEdit
        },
        {
            label: 'Törlés',
            icon: 'fas fa-trash',
            className: 'btn-outline-danger',
            onClick: onDelete
        }
    ]
});

export const createTeamTableConfig = (onEdit, onDelete) => ({
    columns: [
        {
            header: 'Csapat',
            key: 'name',
            render: (team) => (
                <div className="d-flex align-items-center">
                    <div className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center me-2" 
                         style={{ width: '32px', height: '32px', fontSize: '14px' }}>
                        {team.name?.charAt(0) || '?'}
                    </div>
                    <div>
                        <div className="fw-medium">{team.name}</div>
                        <small className="text-muted">{team.age_group}</small>
                    </div>
                </div>
            )
        },
        {
            header: 'Edző',
            key: 'coach_name',
            render: (team) => team.coach_name || (
                <span className="text-muted">Nincs edző</span>
            )
        },
        {
            header: 'Játékosok',
            key: 'player_count',
            render: (team) => (
                <span className="badge bg-primary">{team.player_count || 0} fő</span>
            )
        },
        {
            header: 'Szezon',
            key: 'season',
            render: (team) => team.season || '-'
        }
    ],
    actions: [
        {
            label: 'Szerkesztés',
            icon: 'fas fa-edit',
            className: 'btn-outline-primary',
            onClick: onEdit
        },
        {
            label: 'Törlés',
            icon: 'fas fa-trash',
            className: 'btn-outline-danger',
            onClick: onDelete
        }
    ]
});

export default ResponsiveTable;