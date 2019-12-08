export default ({
  addToast,

  onError = f => f,
  onCompleted = f => f,
}) => {
  const errorHandler = err => {
    const msgs = err.message.split('\n')
    const msg = msgs[0].replace('GraphQL error: ', '')

    addToast(msg, { appearance: 'error' })
    onError({ err, msg })
  }

  return { onError: errorHandler, onCompleted }
}
