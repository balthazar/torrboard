export default ({
  addToast,
  onError = err => addToast(err.message.replace('GraphQL error: ', ''), { appearance: 'error' }),
  onCompleted = f => f,
}) => ({ onError, onCompleted })
