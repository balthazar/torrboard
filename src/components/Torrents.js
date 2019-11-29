import React, { useState, useEffect } from 'react'

export default () => {
  const [isLoading, setLoading] = useState(false)
  const [torrents, setTorrents] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      const res = await fetch(`${__APIURL__}/torrents`, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })

      setLoading(false)

      const data = await res.json()
      setTorrents(data)
    }

    fetchData()
  }, [])

  console.log(torrents)

  return <div>home</div>
}
