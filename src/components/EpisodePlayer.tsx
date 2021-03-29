import { useEffect, useState } from "react"
import VideoPlayer from './VideoPlayer'
import { Link } from "react-router-dom"

// Possible API key from tune.pk : 777750fea4d3bd585bf47dc1873619fc

const supportedServers = [ "OU", "MF", "UP" ]

interface TEpisodePlayer {
    fromEpisode: boolean,
    episode: Record<string,any>,
    setEpisodeName: (title: string) => void,
    episodesList: Record<string,any>[],
    animeId: string,
    episodeNumber: string,
    soon: boolean
}

const EpisodePlayer = ({ soon, fromEpisode, episode, setEpisodeName, episodesList, animeId, episodeNumber }: TEpisodePlayer) => {

    type quality = Array<Record<string,string>>

    const [ episodeSources, updateSources ] = useState<Record<string,quality | string>>({})
    const [ currentSource, updateCurrent ] = useState<[string,string | Record<string,string>[]]>(["",""])
    const [ introInterval, updateIntroInterval ] = useState<[string,string]>(["",""])
    const [ status, updateStatus ] = useState<string[]>([])

    function setStatus(status: string, index: number) {
        updateStatus(oldStatus => {
            oldStatus.splice(index, 1, status)
            return oldStatus
        })
    }

    function getServers(sources: string) {
        // Remove backslashes in sources list
        let s = sources.replace(/\\/g, "").slice(2,-2).split("\",\"")
        let currentUpdated = false

        updateStatus(Array(s.length).fill("pending"))

        function setUnsupportedServer(server: string, result: string, index: number) {
            updateSources(oldEpisodeSources => ({
                ...oldEpisodeSources,
                [server]: result
            }))
            if (!currentUpdated) {
                updateCurrent([server, result])
                currentUpdated = true
            }
            setStatus("parsed", index)
        }

        s.forEach((item,index) => {
            item = item.replace("http://", "https://")
            switch (true) {
                case item.includes("tune.pk"):
                    let sliced = item.slice(item.indexOf("video/") + 6)
                    item = "https://embed.tune.pk/play/" + sliced.substring(0, sliced.indexOf("/"))
                    setUnsupportedServer("TP", item, index)
                    return    
                case item.includes("vidlox"):
                    setUnsupportedServer("VL", item, index); return
                case item.includes("fembed"):
                    item = item.replace("api/source", "v")
                    setUnsupportedServer("FD", item, index); return
                case item.includes("mixdrop"):
                    setUnsupportedServer("MP", item, index); return
                case item.includes("jawcloud"):
                    setUnsupportedServer("JC", item, index); return
                default:
                    break;
            }
            let headers = { 'User-Agent': navigator.userAgent }
            let method = 'GET'
            if (item.includes("ok.ru") || item.includes("fembed")) {
                method = 'POST'
            }
            if (item.includes("ok.ru")) {
                item = "https://ok.ru/dk?cmd=videoPlayerMetadata&mid=" + item.slice(item.indexOf("video") + 6)
            } else if (item.includes("uptostream")) {
                item = "https://uptostream.com/api/streaming/source/get?token=&file_code=" + item.slice(item.indexOf(".com/") + 5)
            }
            if (!item.includes("uptostream")) {
                item = "https://cors.bridged.cc/" + item
            }
            fetch(item, {
                method: method,
                headers: new Headers(headers),
            })
            .then((response) => {
                if (item.includes("ok.ru") || item.includes("uptostream")) {
                    return response.json()
                } else {
                    return response.text()
                }
            })
            .then((data) => {
                let ds = item.includes("ok.ru") || item.includes("uptostream") ? decodeServers(item,data) : decodeHTML(item,data)
                if (ds[0].length && ds[1].length) {
                    if (!currentUpdated || !supportedServers.includes(currentSource[0]) || ds[0] == "OU") {
                        updateCurrent(ds);
                        currentUpdated = true
                    }
                    updateSources(oldEpisodeSources => ({
                        ...oldEpisodeSources,
                        [ds[0]]: ds[1]
                    }))
                    setStatus("parsed", index)
                } else {
                    setStatus("failed", index)
                }
            })
        })
    }

    useEffect(() => {
        const controller = new AbortController()
        let ep: Record<string,any> | undefined = undefined
        if (fromEpisode && Object.keys(episode).length) {
            ep = episode
        } else if (!fromEpisode && episodesList.length) {
            ep = episodesList[parseInt(episodeNumber) - 1]
        }
        if (ep !== undefined) {
            setEpisodeName(ep["episode_name"])
            updateIntroInterval([ep["skip_from"], ep["skip_to"]])
            fetch("https://cors.bridged.cc/" + encodeURI(ep["episode_urls"][1]["episode_url"]), { signal: controller.signal })
            .then((response) => { 
                response.text().then((sources) => {
                    getServers(sources)
                })
            })    
        }
        return () => {
            if (controller && !controller.signal.aborted) {
                try { controller.abort() } catch (error) {}
            }
            updateCurrent(["",""])
            updateSources({})    
        }
    }, [episodeNumber,episodesList])

    useEffect(() => {
        if (soon) {
            setEpisodeName("قريبا")
        }
    }, [soon])

    return (
        <section className="anime-watch">
            { !soon ? 
            <>
                { supportedServers.includes(currentSource[0]) ? 
                <VideoPlayer 
                    introInterval = { introInterval }
                    sources = {{
                        type: 'video',
                        sources: currentSource[0] != "" ? currentSource[1] : {}
                    }} />
                : <div className={ Object.keys(episodeSources).length ? "iframe-video-player" : "iframe-video-player loading" }>
                    { !status.includes("pending") ?
                        <iframe allowFullScreen={ true } className="iframe-video" src={ currentSource[1] as string } />
                    : null }
                </div> }
            </>
            : <div className="iframe-video-player">
                <div className="soon-screen">
                    هذا الأنمي سيبث قريبا
                </div>
            </div> }
                
            <div className="player-settings">
                { parseInt(episodeNumber) > 1 && episodesList.length != 0 ? 
                    <Link data-tippy-content={ episodesList[(parseInt(episodeNumber) - 2)]["episode_name"] } id="previous" to={ "/" + animeId + "/" + (parseInt(episodeNumber) - 1).toString() }
                        className="player-episode-skip"><span className="mdi mdi-chevron-right"></span>الحلقة السابقة</Link>
                    : 
                    <a id="previous" className="player-episode-skip disabled"><span className="mdi mdi-chevron-right"></span>الحلقة السابقة</a> 
                }
                { !soon ?
                <div className="server-settings">
                    { Object.keys(episodeSources).length ?
                        <select name="server" className="selection" id="server-select" onChange={ (e) => updateCurrent([ e.target.value, episodeSources[e.target.value] ]) } value={ currentSource[0] }>
                            {
                                Object.keys(episodeSources).map((key) => {
                                    return <option key={ key } value={ key } id={ key }>{ key }{ supportedServers.includes(key) ? " - المشغل السريع" : " - مشغل خارجي"}</option>
                                })
                            }
                        </select>
                        : <span className="servers-loading-message"><span className="mdi mdi-loading mdi-spin"></span>جاري العمل على الخوادم</span>
                    }
                </div> : null }
                { parseInt(episodeNumber) < episodesList.length ? 
                    <Link data-tippy-content={ episodesList[parseInt(episodeNumber)]["episode_name"] } id="next" to={ "/" + animeId + "/" + (parseInt(episodeNumber) + 1).toString() }
                        className="player-episode-skip">الحلقة القادمة<span className="mdi mdi-chevron-left mdi-left"></span></Link>
                    : 
                    <a id="next" className="player-episode-skip disabled">الحلقة القادمة<span className="mdi mdi-chevron-left mdi-left"></span></a> 
                }
            </div>
        </section>
    )

    function decodeHTML(s:string, data:string): [string,Record<string,string>[]] {
        if (s.includes("mediafire")) {
            // Search for the download button href (yeah i know too simple)
            var regex = /href="(https?:\/\/download(?:\d{0,9}){4}\.mediafire\.com.*?\.mp4)/
            var matches = data.match(regex)
            if (matches) {
                return ["MF", [{ src: matches[1], size: "720" }]]
            }
            return ["",[]]
        }
        return ["",[]]
    }

    function decodeServers(s:string, data:Record<string,any>): [string,Array<Record<string,string>>] {
        if (s.includes("uptostream")) {
            var source = data["data"]["sources"]
            source = source.replace("\\/=+$\\/", "/=+$/")
            source = source.split("window").join("this")
            var regexReturn = /return\n/g;
            source = source.replace(regexReturn, "return ");
            var sources = evalSources(source)
            return ["UP", sources.map((quality: Record<string,any>) => {
                return {
                    src: quality["src"],
                    size: quality["label"].slice(0,-1)   
                }
            })]    
        }
        if (s.includes("ok.ru")) {
            let q: Record<string,string> = { mobile: "144", lowest: "240", low: "360", sd: "480", hd: "720" }
            let qualities: Array<Record<string,string>> = []
            // Videos links are in "videos" array of the JSON response
            if ("videos" in data) {
                data["videos"].forEach((quality: Record<string,string>) => {
                    qualities.push({ src: quality["url"], size: q[quality["name"]] })
                })
                return ["OU", qualities]    
            }
            return ["",[]]
        }
        return ["",[]]
    }
    
}

/**
 * 
 * Fembed: Redirector are tricky
 * Mixdrop: 403 Forbidden due to Referer missing and IP lock
 * Jawcloud: 403 Forbidden IP lock
 */

function evalSources(source: string) {
    var sources = new Function(source + "return sources;")
    return sources()
}

// Code to decode packed JS code 
var P_A_C_K_E_R = {
    detect: function (str: string) {
        return P_A_C_K_E_R._starts_with(str.toLowerCase().replace(/ +/g, ''), 'eval(function(') ||
                P_A_C_K_E_R._starts_with(str.toLowerCase().replace(/ +/g, ''), 'eval((function(') ;
    },
    unpack: function (str: string) {
        var unpacked_source = '';
        if (P_A_C_K_E_R.detect(str)) {
            try {
                eval('unpacked_source = ' + str.substring(4) + ';')
                if (typeof unpacked_source == 'string' && unpacked_source) {
                    str = unpacked_source;
                }
            } catch (error) {}
        }
        return str;
    },
    _starts_with: function (str: string, what:string) {
        return str.substr(0, what.length) === what;
    }
}

export default EpisodePlayer