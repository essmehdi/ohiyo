import { useRouter } from 'next/router'
import '../styles/slayer.css'
import NProgress from 'nprogress';
import Router from 'next/router';
import "../styles/nprogress.css";
import 'tippy.js/dist/tippy.css'
import { useEffect } from 'react';
import { useDetectAdBlock } from 'adblock-detect-react'
import AntiADB from './adblock'

function MyApp({ Component, pageProps }) {

    const adBlockDetected = useDetectAdBlock()
    const router = useRouter()

    NProgress.configure({
        minimum: 0.3,
        easing: 'ease-out',
        speed: 800,
        showSpinner: false
    })

    Router.events.on('routeChangeStart', () => NProgress.start())
    Router.events.on('routeChangeComplete', () => NProgress.done())
    Router.events.on('routeChangeError', () => NProgress.done())

    return (
        <>
        { !adBlockDetected ?
            <Component {...pageProps} />
        : <AntiADB /> }</>
    )
}

export default MyApp
