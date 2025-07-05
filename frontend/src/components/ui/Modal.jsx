import React, { useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import './Modal.css';

const Modal = ({
  isOpen,
  onClose,
  children,
  size = 'base',
  centered = true,
  backdrop = true,
  backdropClick = true,
  escapeKey = true,
  focusTrap = true,
  className = '',
  overlayClassName = '',
  contentClassName = '',
  title,
  description,
  ...props
}) => {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Handle escape key
  const handleEscapeKey = useCallback((event) => {
    if (escapeKey && event.key === 'Escape') {
      onClose();
    }
  }, [escapeKey, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((event) => {
    if (backdrop && backdropClick && event.target === event.currentTarget) {
      onClose();
    }
  }, [backdrop, backdropClick, onClose]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement;
      
      // Focus the modal
      if (modalRef.current && focusTrap) {
        modalRef.current.focus();
      }
      
      // Add escape key listener
      document.addEventListener('keydown', handleEscapeKey);
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Remove escape key listener
        document.removeEventListener('keydown', handleEscapeKey);
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Restore focus
        if (previousActiveElement.current && focusTrap) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [isOpen, handleEscapeKey, focusTrap]);

  // Focus trap functionality
  const handleTabKey = useCallback((event) => {
    if (!focusTrap || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.key === 'Tab') {
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          event.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          event.preventDefault();
        }
      }
    }
  }, [focusTrap]);

  useEffect(() => {
    if (isOpen && focusTrap) {
      document.addEventListener('keydown', handleTabKey);
      return () => {
        document.removeEventListener('keydown', handleTabKey);
      };
    }
  }, [isOpen, focusTrap, handleTabKey]);

  if (!isOpen) return null;

  const modalClasses = [
    'modal',
    `modal--${size}`,
    centered && 'modal--centered',
    className
  ].filter(Boolean).join(' ');

  const overlayClasses = [
    'modal__overlay',
    overlayClassName
  ].filter(Boolean).join(' ');

  const contentClasses = [
    'modal__content',
    contentClassName
  ].filter(Boolean).join(' ');

  const modalContent = (
    <div 
      className={overlayClasses}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
    >
      <div 
        className={modalClasses}
        ref={modalRef}
        tabIndex={-1}
        {...props}
      >
        <div className={contentClasses}>
          {children}
        </div>
      </div>
    </div>
  );

  // Render to portal
  return ReactDOM.createPortal(
    modalContent,
    document.body
  );
};

const ModalHeader = ({
  children,
  closeButton = true,
  onClose,
  className = '',
  ...props
}) => {
  return (
    <div className={`modal__header ${className}`} {...props}>
      <div className="modal__header-content">
        {children}
      </div>
      {closeButton && (
        <button
          type="button"
          className="modal__close"
          onClick={onClose}
          aria-label="Close modal"
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}
    </div>
  );
};

const ModalBody = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`modal__body ${className}`} {...props}>
      {children}
    </div>
  );
};

const ModalFooter = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`modal__footer ${className}`} {...props}>
      {children}
    </div>
  );
};

const ModalTitle = ({
  children,
  as: Component = 'h2',
  className = '',
  ...props
}) => {
  return (
    <Component 
      id="modal-title" 
      className={`modal__title ${className}`} 
      {...props}
    >
      {children}
    </Component>
  );
};

const ModalDescription = ({
  children,
  as: Component = 'p',
  className = '',
  ...props
}) => {
  return (
    <Component 
      id="modal-description" 
      className={`modal__description ${className}`} 
      {...props}
    >
      {children}
    </Component>
  );
};

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  size: PropTypes.oneOf(['sm', 'base', 'lg', 'xl', 'full']),
  centered: PropTypes.bool,
  backdrop: PropTypes.bool,
  backdropClick: PropTypes.bool,
  escapeKey: PropTypes.bool,
  focusTrap: PropTypes.bool,
  className: PropTypes.string,
  overlayClassName: PropTypes.string,
  contentClassName: PropTypes.string,
  title: PropTypes.string,
  description: PropTypes.string
};

ModalHeader.propTypes = {
  children: PropTypes.node.isRequired,
  closeButton: PropTypes.bool,
  onClose: PropTypes.func,
  className: PropTypes.string
};

ModalBody.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

ModalFooter.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

ModalTitle.propTypes = {
  children: PropTypes.node.isRequired,
  as: PropTypes.elementType,
  className: PropTypes.string
};

ModalDescription.propTypes = {
  children: PropTypes.node.isRequired,
  as: PropTypes.elementType,
  className: PropTypes.string
};

Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;
Modal.Title = ModalTitle;
Modal.Description = ModalDescription;

export default Modal;