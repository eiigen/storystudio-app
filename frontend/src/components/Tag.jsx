const typeColors = {
  text: 'tag-text',
  image: 'tag-image',
  audio: 'tag-audio',
  video: 'tag-video',
}

export default function Tag({ type, className = '', children }) {
  return <span className={`tag ${typeColors[type] || ''} ${className}`}>{children}</span>
}
