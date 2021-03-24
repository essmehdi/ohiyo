import React, { useEffect,useState } from 'react'
import Episode from '../components/Episode'
import tippy, { followCursor } from 'tippy.js'

const ENDPOINT = "https://cors.bridged.cc/https://anslayer.com/anime/public/animes/get-published-animes"
var params = {
    _limit: 30,
    _order_by: "latest_first",
    just_info: "Yes"
}

const AnimeList = ({ showEpisodeName, searchMode, className, searchTerm }) => {

    const [ content, updateContent ] = useState([])

    /**
     * searching: still searching
     * error: if any error occured
     * no-results: no result found
     * success: search finished with positive results
     * @Ritzy
     */
    const [ status, updateStatus ] = useState("searching")
    const [ page, updatePage ] = useState(1)
    const [ lastHeight, updateLastHeight ] = useState(0)

    function fetchData(resetPage) {
        const controller = new AbortController()
        if (resetPage) {
            updateContent([])
            updatePage(1)
            updateLastHeight(0)
        }
        params["_offset"] = (page - 1) * 30
        if (searchTerm && searchTerm.length != 0) {
            params["list_type"] = "filter"
            params["anime_name"] = searchTerm
        } else {
            if (searchMode) {
                params["list_type"] = "anime_list"
            } else {
                params["list_type"] = "latest_updated_episode_new"
            }
            if (params["anime_name"]) delete params["anime_name"]
        }    
        var endpoint = ENDPOINT + "?json=" + encodeURI(JSON.stringify(params))
        updateStatus("searching")

        fetch(endpoint, { 
            headers: new Headers({
                "Client-Id": process.env.REACT_APP_CLIENT_ID,
                "Client-Secret": process.env.REACT_APP_CLIENT_SECRET,
            }), signal: controller.signal
        })
        .then((response) => {
            return response.json()
        })
        .then((data) => {
            if (data && data["response"] && !Array.isArray(data["response"])) {
                updateContent((oldData) => oldData.concat(data["response"]["data"]))
                updateStatus("success")
            } else {
                if (page == 1) {
                    updateContent([])
                }
                updateStatus("no-results")
            }
        })
        .catch((error) => {
            if (error.name === "AbortError") return
            updateContent([])
            updateStatus("error")
        })
        return () => { if (controller) controller.abort() }
    }

    useEffect(() => {
        if (searchMode) {
            return fetchData(true)
        }
    }, [searchTerm])

    useEffect(() => {
        return fetchData(false)
    }, [page])

    useEffect(() => {
        /**
         * To prevent bottom event from recurring,
         * I set a state for latest scroll height so 
         * the function will only be triggered when
         * it's on the bottom and also higher than the
         * last height triggered height.
         * Also I added 200px offset for the loading
         * element. @Ritzy
         */
        window.onscroll = () => {
            if (status == "success" && window.pageYOffset > window.scrollMaxY - 30 && window.pageYOffset > lastHeight + 200) {
                updateLastHeight(window.scrollMaxY)
                updatePage((page) => page + 1)
            }
        }
    })

    function NoResults({ NoHeight }) {
        var className = NoHeight ? "error-message no-height" : "error-message"
        if (status == "searching") {
            return <div className={ className }><span className="mdi mdi-loading mdi-spin"></span><p>جاري العمل</p></div>
        } else if (status == "no-results") {
            return <div className={ className }><span className="mdi mdi-close"></span><p>لا توجد نتائج</p></div>
        } else {
            return <div className={ className }><span className="mdi mdi-exclamation-thick"></span><p>حصل خطأ ما</p></div>
        }
    }

    return (
        <>
        { status != "success" && (page == 1) ? <NoResults /> : 
            <div className={ className }>
                { content.map((episode,index) => 
                    <Episode key = { index }
                        showEpisodeName = { showEpisodeName }
                        animeName = {episode["anime_name"]}
                        url={ showEpisodeName ? `/${episode["anime_id"]}?from-episode=${episode["latest_episode_id"]}` : '/' + episode["anime_id"] + '/1' }
                        cover = {episode["anime_cover_image_url"]}
                        episodeName = {episode["latest_episode_name"]}
                    />
                ) }
            </div> }
        { status == "searching" && page != 1 ? <NoResults NoHeight={ true } /> : null }
        </>
    )
}

export default AnimeList