const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

export default b => {
  if (b === 0) {
    return '0B'
  }

  const i = Math.floor(Math.log(b) / Math.log(1e3))
  return `${parseFloat((b / Math.pow(1e3, i)).toFixed(2))}${sizes[i]}`
}
