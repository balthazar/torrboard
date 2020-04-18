import get from 'lodash/get'

let state = 'play'

export default (disable, action) => {
  const already = get(document.getElementsByTagName('audio'), '0')

  if (disable) {
    if (already) {
      already.src = ''
    }

    return
  }

  if (already) {
    if (action && action !== state) {
      state = action
      already[action]()
    }
    return
  }

  const audioTag = document.createElement('audio')
  document.body.appendChild(audioTag)
  audioTag.src =
    'https://raw.githubusercontent.com/anars/blank-audio/master/10-seconds-of-silence.mp3'
  audioTag.loop = true

  audioTag.play()
}
