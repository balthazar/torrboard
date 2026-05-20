import React, { useState } from 'react'
import { gql, useQuery, useMutation } from '@apollo/client'
import styled from 'styled-components'
import { MdAdd, MdClose, MdMail, MdPerson, MdEvent, MdDelete, MdCheck } from 'react-icons/md'
import Tippy from '@tippyjs/react'
import { useToasts } from './toasts'
import get from 'lodash/get'
import differenceInMinutes from 'date-fns/differenceInMinutes'
import differenceInHours from 'date-fns/differenceInHours'
import differenceInDays from 'date-fns/differenceInDays'

import Placeloader from './Placeloader'
import Button from './Button'
import Input from './Input'

import apiHandlers from '../fn/apiHandlers'

const Container = styled.div`
  max-width: 900px;
`

const Section = styled.section`
  & + & {
    margin-top: ${p => p.theme.spacing[7]};
  }
`

const SectionTitle = styled.h3`
  font-size: ${p => p.theme.font.size.xs};
  font-weight: ${p => p.theme.font.weight.semibold};
  letter-spacing: ${p => p.theme.font.tracking.wider};
  text-transform: uppercase;
  color: ${p => p.theme.colors.textSubtle};
  margin-bottom: ${p => p.theme.spacing[3]};
  padding-bottom: ${p => p.theme.spacing[2]};
  border-bottom: 1px solid ${p => p.theme.colors.border};
`

const AddInputWrap = styled.div`
  position: relative;
  margin-bottom: ${p => p.theme.spacing[3]};
  max-width: 480px;
`

const AddInputIcon = styled.div`
  position: absolute;
  left: ${p => p.theme.spacing[4]};
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  color: ${p => p.theme.colors.textMuted};
  pointer-events: none;
`

const AddInput = styled(Input)`
  padding-left: 44px;
`

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${p => p.theme.spacing[2]};
`

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${p => p.theme.spacing[2]};
  padding: 6px ${p => p.theme.spacing[2]} 6px ${p => p.theme.spacing[3]};
  border-radius: ${p => p.theme.radii.full};
  background-color: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  font-size: ${p => p.theme.font.size.sm};
  color: ${p => p.theme.colors.textMuted};

  > span {
    max-width: 320px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`

const ChipRemove = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: ${p => p.theme.radii.full};
  color: ${p => p.theme.colors.textSubtle};
  cursor: pointer;
  transition: background-color ${p => p.theme.motion.fast},
    color ${p => p.theme.motion.fast};

  &:hover {
    background-color: ${p => p.theme.colors.surfaceActive};
    color: ${p => p.theme.colors.error};
  }
`

const Users = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${p => p.theme.spacing[2]};
`

const UserCard = styled.div`
  display: flex;
  align-items: center;
  gap: ${p => p.theme.spacing[3]};
  padding: ${p => p.theme.spacing[3]} ${p => p.theme.spacing[4]};
  border-radius: ${p => p.theme.radii.md};
  background-color: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
`

const UserName = styled.span`
  font-weight: ${p => p.theme.font.weight.medium};
  color: ${p => p.theme.colors.text};
`

const UserEmail = styled.span`
  font-size: ${p => p.theme.font.size.sm};
  color: ${p => p.theme.colors.textMuted};
  font-family: ${p => p.theme.font.mono};
`

const UserMeta = styled.span`
  font-size: ${p => p.theme.font.size.xs};
  color: ${p => p.theme.colors.textSubtle};
  font-family: ${p => p.theme.font.mono};
  letter-spacing: ${p => p.theme.font.tracking.wide};
  text-transform: uppercase;
`

const UserActions = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: ${p => p.theme.spacing[2]};
`

const IconButton = styled.button`
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${p => p.theme.radii.full};
  background-color: transparent;
  color: ${p => p.theme.colors.textMuted};
  cursor: pointer;
  transition: background-color ${p => p.theme.motion.fast},
    color ${p => p.theme.motion.fast};

  &:hover {
    background-color: ${p => p.theme.colors.surfaceActive};
    color: ${p => (p.$danger ? p.theme.colors.error : p.theme.colors.text)};
  }
`

const StatusPill = styled.span`
  padding: 3px 10px;
  border-radius: ${p => p.theme.radii.full};
  font-size: ${p => p.theme.font.size.xs};
  font-weight: ${p => p.theme.font.weight.semibold};
  letter-spacing: ${p => p.theme.font.tracking.wider};
  text-transform: uppercase;
  background-color: ${p =>
    p.$active ? `${p.theme.colors.success}20` : `${p.theme.colors.error}20`};
  color: ${p => (p.$active ? p.theme.colors.success : p.theme.colors.error)};
`

const CreateForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${p => p.theme.spacing[3]};
  max-width: 360px;
`

const FormField = styled.div`
  position: relative;
`

const FieldIcon = styled.div`
  position: absolute;
  left: ${p => p.theme.spacing[4]};
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  color: ${p => p.theme.colors.textMuted};
  pointer-events: none;
`

const StyledInput = styled(Input)`
  padding-left: 44px;
`

const DateInput = styled(Input).attrs({ type: 'date' })`
  padding-left: 44px;
  color-scheme: dark;
`

const Activity = styled.span`
  font-size: ${p => p.theme.font.size.xs};
  color: ${p => p.theme.colors.textSubtle};
  font-family: ${p => p.theme.font.mono};
  letter-spacing: ${p => p.theme.font.tracking.wide};
  text-transform: uppercase;
  margin-left: ${p => p.theme.spacing[2]};
`

const formatAgo = date => {
  if (!date) return null
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  const mins = differenceInMinutes(now, d)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = differenceInHours(now, d)
  if (hours < 24) return `${hours}h ago`
  const days = differenceInDays(now, d)
  return `${days}d ago`
}

const lastActivityLabel = user => {
  if (user.lastWatchedAt) {
    return `Watched ${formatAgo(user.lastWatchedAt)}`
  }
  if (user.lastSeenAt) {
    return `Seen ${formatAgo(user.lastSeenAt)}`
  }
  return null
}

const Empty = styled.div`
  color: ${p => p.theme.colors.textSubtle};
  font-size: ${p => p.theme.font.size.sm};
  padding: ${p => p.theme.spacing[3]};
`

const GET_GRABS = gql`
  {
    config {
      autoGrabs
    }
  }
`

const GET_USERS = gql`
  {
    users {
      name
      email
      expires
      inviteCode
      watched
      lastWatchedAt
      lastSeenAt
    }
  }
`

const SET_GRABS = gql`
  mutation setAutoGrabs($autoGrabs: [String]!) {
    setAutoGrabs(autoGrabs: $autoGrabs)
  }
`

const CREATE_USER = gql`
  mutation createUser($name: String!, $email: String!, $expires: String!) {
    createUser(name: $name, email: $email, expires: $expires)
  }
`

const DELETE_USER = gql`
  mutation deleteUser($name: String!) {
    deleteUser(name: $name)
  }
`

export default () => {
  const [text, setText] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [expires, setExpires] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const { addToast } = useToasts()

  const { loading: loadingUsers, data: usersData } = useQuery(GET_USERS)

  const { loading: loadingGrabs, data: grabsData } = useQuery(GET_GRABS, {
    pollInterval: 30e3,
  })

  const [setGrabs] = useMutation(SET_GRABS, {
    update(cache, { data }) {
      cache.writeQuery({
        query: GET_GRABS,
        data: { config: { autoGrabs: data.setAutoGrabs, __typename: 'Config' } },
      })
    },
  })

  const [deleteUserMut] = useMutation(DELETE_USER, {
    refetchQueries: [{ query: GET_USERS }],
    onCompleted: () => addToast('User deleted.', { appearance: 'success' }),
  })

  const [createUserMut] = useMutation(
    CREATE_USER,
    apiHandlers({
      onCompleted: () => {
        addToast('User created.', { appearance: 'success' })
        setName('')
        setEmail('')
      },
      addToast,
    }),
  )

  const grabs = get(grabsData, 'config.autoGrabs')
  const users = get(usersData, 'users', []).filter(u => u.name !== 'master')

  const removeGrab = t => {
    setGrabs({ variables: { autoGrabs: grabs.filter(g => g !== t) } })
  }

  const onKeyDown = e => {
    if (e.keyCode === 13 && text.trim()) {
      setGrabs({ variables: { autoGrabs: [...grabs, text.trim()] } })
      setText('')
    }
  }

  const createUser = () => {
    if (!name || !email || !expires) {
      return addToast('Invalid params.', { appearance: 'error' })
    }
    createUserMut({ variables: { name, email, expires } })
  }

  return (
    <Container>
      <Section>
        <SectionTitle>RSS Auto Grabs</SectionTitle>

        <AddInputWrap>
          <AddInputIcon>
            <MdAdd size={18} />
          </AddInputIcon>
          <AddInput
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Add a torrent name to auto-grab"
          />
        </AddInputWrap>

        {loadingGrabs ? (
          <Placeloader style={{ width: '100%', height: 80 }} />
        ) : (
          <Chips>
            {(grabs || []).length === 0 && <Empty>No auto-grabs configured.</Empty>}
            {(grabs || []).map((t, i) => (
              <Chip key={i}>
                <span title={t}>{t}</span>
                <ChipRemove onClick={() => removeGrab(t)} aria-label="Remove">
                  <MdClose size={14} />
                </ChipRemove>
              </Chip>
            ))}
          </Chips>
        )}
      </Section>

      <Section>
        <SectionTitle>Users</SectionTitle>

        {loadingUsers ? (
          <Placeloader style={{ width: '100%', height: 80 }} />
        ) : (
          <Users>
            {!users.length && <Empty>No users to display.</Empty>}
            {users.map(user => {
              const activity = lastActivityLabel(user)
              const isConfirming = confirmDelete === user.name
              return (
                <UserCard key={user.name}>
                  <UserName>{user.name}</UserName>
                  <UserEmail>{user.email}</UserEmail>
                  <UserMeta>{user.watched.length} watches</UserMeta>
                  {activity && <Activity>{activity}</Activity>}
                  <UserActions>
                    <StatusPill $active={!user.inviteCode}>
                      {user.inviteCode ? 'Inactive' : 'Active'}
                    </StatusPill>
                    {isConfirming ? (
                      <>
                        <Tippy content="Cancel">
                          <IconButton onClick={() => setConfirmDelete(null)}>
                            <MdClose size={18} />
                          </IconButton>
                        </Tippy>
                        <Tippy content="Confirm delete">
                          <IconButton
                            $danger
                            onClick={() => {
                              deleteUserMut({ variables: { name: user.name } })
                              setConfirmDelete(null)
                            }}
                          >
                            <MdCheck size={18} />
                          </IconButton>
                        </Tippy>
                      </>
                    ) : (
                      <Tippy content="Delete user">
                        <IconButton $danger onClick={() => setConfirmDelete(user.name)}>
                          <MdDelete size={18} />
                        </IconButton>
                      </Tippy>
                    )}
                  </UserActions>
                </UserCard>
              )
            })}
          </Users>
        )}
      </Section>

      <Section>
        <SectionTitle>Create User</SectionTitle>

        <CreateForm>
          <FormField>
            <FieldIcon>
              <MdMail size={18} />
            </FieldIcon>
            <StyledInput
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
            />
          </FormField>
          <FormField>
            <FieldIcon>
              <MdPerson size={18} />
            </FieldIcon>
            <StyledInput value={name} onChange={e => setName(e.target.value)} placeholder="Name" />
          </FormField>
          <FormField>
            <FieldIcon>
              <MdEvent size={18} />
            </FieldIcon>
            <DateInput onChange={e => setExpires(e.target.value)} />
          </FormField>
          <Button onClick={createUser}>Create user</Button>
        </CreateForm>
      </Section>
    </Container>
  )
}
