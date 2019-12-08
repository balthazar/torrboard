export default ({
  addToast,

  onError = f => f,
  onCompleted = f => f,
}) => {
  const errorHandler = err => {
    const msg = (err[0] || err).message.replace('GraphQL error: ', '')
    addToast(msg, { appearance: 'error' })
    onError({ err, msg })
  }

  return { onError: errorHandler, onCompleted }
}
