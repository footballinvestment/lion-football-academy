import React from 'react';
import PropTypes from 'prop-types';
import './Card.css';

const Card = ({
  children,
  variant = 'default',
  padding = 'base',
  shadow = 'base',
  rounded = 'md',
  border = false,
  hoverable = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'card';
  const variantClasses = `card--${variant}`;
  const paddingClasses = `card--padding-${padding}`;
  const shadowClasses = `card--shadow-${shadow}`;
  const roundedClasses = `card--rounded-${rounded}`;
  const stateClasses = [
    border && 'card--border',
    hoverable && 'card--hoverable'
  ].filter(Boolean).join(' ');

  const cardClasses = [
    baseClasses,
    variantClasses,
    paddingClasses,
    shadowClasses,
    roundedClasses,
    stateClasses,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses} {...props}>
      {children}
    </div>
  );
};

const CardHeader = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`card__header ${className}`} {...props}>
      {children}
    </div>
  );
};

const CardBody = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`card__body ${className}`} {...props}>
      {children}
    </div>
  );
};

const CardFooter = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`card__footer ${className}`} {...props}>
      {children}
    </div>
  );
};

const CardTitle = ({
  children,
  as: Component = 'h3',
  className = '',
  ...props
}) => {
  return (
    <Component className={`card__title ${className}`} {...props}>
      {children}
    </Component>
  );
};

const CardSubtitle = ({
  children,
  as: Component = 'p',
  className = '',
  ...props
}) => {
  return (
    <Component className={`card__subtitle ${className}`} {...props}>
      {children}
    </Component>
  );
};

const CardText = ({
  children,
  as: Component = 'p',
  className = '',
  ...props
}) => {
  return (
    <Component className={`card__text ${className}`} {...props}>
      {children}
    </Component>
  );
};

const CardImage = ({
  src,
  alt,
  position = 'top',
  className = '',
  ...props
}) => {
  return (
    <img 
      src={src} 
      alt={alt} 
      className={`card__image card__image--${position} ${className}`} 
      {...props} 
    />
  );
};

Card.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf([
    'default',
    'primary',
    'secondary',
    'accent',
    'success',
    'warning',
    'error',
    'admin',
    'coach',
    'player',
    'parent'
  ]),
  padding: PropTypes.oneOf(['none', 'sm', 'base', 'lg', 'xl']),
  shadow: PropTypes.oneOf(['none', 'xs', 'sm', 'base', 'md', 'lg', 'xl']),
  rounded: PropTypes.oneOf(['none', 'sm', 'base', 'md', 'lg', 'xl', 'full']),
  border: PropTypes.bool,
  hoverable: PropTypes.bool,
  className: PropTypes.string
};

CardHeader.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

CardBody.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

CardFooter.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

CardTitle.propTypes = {
  children: PropTypes.node.isRequired,
  as: PropTypes.elementType,
  className: PropTypes.string
};

CardSubtitle.propTypes = {
  children: PropTypes.node.isRequired,
  as: PropTypes.elementType,
  className: PropTypes.string
};

CardText.propTypes = {
  children: PropTypes.node.isRequired,
  as: PropTypes.elementType,
  className: PropTypes.string
};

CardImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
  position: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
  className: PropTypes.string
};

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
Card.Title = CardTitle;
Card.Subtitle = CardSubtitle;
Card.Text = CardText;
Card.Image = CardImage;

export default Card;