"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */
import { SessionProvider } from 'next-auth/react'
import Navbar from '../shared/Navbar'


const Provider = ({children, session}: {children: React.ReactNode, session: any}) => {
  return (
    <SessionProvider session={session}>
        <Navbar />
        {children}
    </SessionProvider>
  )
}

export default Provider