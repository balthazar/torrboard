import React from 'react'
import Mortal from 'react-mortal'
import styled from 'styled-components'
import { isMobile } from 'react-device-detect'
import { MdClose } from 'react-icons/md'

const Modal = styled.div`
  position: fixed;
  z-index: 1;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  display: flex;
  align-items: flex-start;
  justify-content: center;
`

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
`

const Body = styled.div`
  padding: ${isMobile ? 10 : 20}px;
  margin-top: ${isMobile ? 0 : 100};
  background-color: ${p => p.theme.bg2};
  color: ${p => p.theme.body};
  display: flex;

  ${isMobile
    ? `

  height: 100vh;
  width: 100vw;

  `
    : `
  min-width: 400px;
  max-width: 600px;
  `}
`

const CloseButton = styled.div`
  position: absolute;
  background-color: rgba(0, 0, 0, 0.2);
  width: 100%;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;

  bottom: 0;
  right: 0;
`

export default ({ isOpened, onClose, children }) => (
  <Mortal
    isOpened={isOpened}
    onClose={onClose}
    motionStyle={(spring, isVisible) => ({
      opacity: spring(isVisible ? 1 : 0),
      modalOffset: spring(isVisible ? 0 : -90, {
        stiffness: isVisible ? 300 : 200,
        damping: isVisible ? 15 : 30,
      }),
    })}
  >
    {(motion, isVisible) => (
      <Modal
        style={{
          pointerEvents: isVisible ? 'auto' : 'none',
        }}
      >
        <Overlay
          onClick={onClose}
          style={{
            opacity: motion.opacity,
            pointerEvents: isVisible ? 'auto' : 'none',
          }}
        />
        <Body
          style={{
            opacity: motion.opacity,
            transform: `translate3d(0, ${motion.modalOffset}px, 0)`,
          }}
        >
          {children}

          {isMobile && (
            <CloseButton onClick={onClose}>
              <MdClose />
            </CloseButton>
          )}
        </Body>
      </Modal>
    )}
  </Mortal>
)
