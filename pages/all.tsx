import { GetServerSideProps } from "next"
import { useRouter } from "next/router"
import React, { useEffect, useState } from "react"
import ContentList from '../components/ContentList'
import Head from 'next/head'
import NavigationWrapper from '../containers/NavigationWrapper'

export const getServerSideProps: GetServerSideProps = async (context) => {
    let props: Record<string,any> = {}

    if (process.env.NODE_ENV == 'development') {
        console.log(context)
    }

    const headers = new Headers({
        "Client-Id": process.env.CLIENT_ID,
        "Client-Secret": process.env.CLIENT_SECRET
    })

    let params: Record<string,any> = {
        _offset: 0,
        _limit: 30,
        _order_by: "latest_first",
        list_type: "anime_list",
        just_info: "Yes"
    }

    // Detect which page is requested (infinite scroll)
    const page = context.query.page ? parseInt(context.query.page.toString()) : 1
    if ( page > 1 ) {
        params._offset = 30 * (page - 1)
    }
    props.page = page

    // Detect if there is a search query
    if (context.query.search && context.query.search != "") {
        params.anime_name = context.query.search
    }

    // Fetch filter options
    const dropdownsFetch = await fetch("https://anslayer.com/anime/public/animes/get-anime-dropdowns", { headers })
    if ( dropdownsFetch.ok ) {
        const dropdowns = await dropdownsFetch.json()
        props.dropdowns = dropdowns.response
        Object.keys(context.query).forEach(key => {
            if (key == "anime_genres") {
                params.list_type != "filter" ? params.list_type = "filter" : null
                params.anime_genre_ids = context.query.anime_genres
                return
            }
            if (Object.keys(props.dropdowns).includes(key)) {
                params.list_type != "filter" ? params.list_type = "filter" : null
                params[key] = context.query[key]
            }
        })
    } else {
        props.dropdowns = {}
    }    

    console.log(params)

    const res = await fetch(`https://anslayer.com/anime/public/animes/get-published-animes?json=${JSON.stringify(params)}`, { headers })

    if (res.ok) {
        const data = await res.json()
        console.log(data)
        if (data && data.response && !Array.isArray(data.response)) {
            props.results = {
                status: "success",
                data: data.response.data
            }
        } else {
            props.results = {
                status: "not-found",
                data: []
            }
        }
    } else {
        props.results = {
            status: "error",
            data: []
        }
    }

    return {
        props
    }
}

const All = ({ results, page, dropdowns }) => {

    const router = useRouter()
    const [ result, updateResult ] = useState<Record<string,any>>({
        status: "",
        data: []
    })
    const [ refreshed, updateRefreshed ] = useState<boolean>(false)
    const [ currentPage, updateCurrent ] = useState<number>(1)
    const filterOptions = {
        ...dropdowns
    }
    const [ filters, updateFilters ] = useState<Record<string,any>>({})

    /**
     * This function changes the search filters
     * @param filterOption the option to update (string)
     * @param value the value to insert or delete (string)
     * @param remove delete or insert the value (string)
     */
     const changeFilter = (filterOption: string, value: string, remove: boolean) => {
        updateFilters(oldFilterOptions => {
            if (!remove) {
                oldFilterOptions[filterOption].push(value)
            } else if (oldFilterOptions[filterOption].includes(value)) {
                let index = oldFilterOptions[filterOption].indexOf(value)
                oldFilterOptions[filterOption].splice(index, 1)
            }
            return {...oldFilterOptions}
        })
    }

    const updateSearch = (value: string) => {
        router.push({
            pathname: "/all",
            query: { search: value }
        }, undefined, { scroll: false })
    }

    useEffect(() => {
        if (Object.keys(results).length) {
            console.log(results)
            if ( results.status == "success" && page != currentPage ) {
                updateResult(oldResults => {
                    return {
                        ...oldResults,
                        status: results.status,
                        data: oldResults.data.concat(results.data)
                    }
                })
                updateCurrent(page)
                updateRefreshed(true)
            } else if ( results.status == "success" && page == 1 ) {
                updateResult(results)
                updateCurrent(1)
                updateRefreshed(true)
            }
        }
    }, [results])

    useEffect(() => {
        let observer = new IntersectionObserver((entries) => {
            if (refreshed && entries[0] && entries[0].isIntersecting) {
                updateRefreshed(false)
                router.push({
                    pathname: "/all",
                    query: { ...router.query, page: page + 1 }
                }, undefined, { scroll: false })
            }
        })
        if (document.querySelector(".bottom-detector")) {
            observer.observe(document.querySelector(".bottom-detector") as Element)
        }

        return () => {
            observer.disconnect()
        }
    })

    return (
        <>
            <Head>
                <title>قائمة الأنمي</title>
                <meta name="keywords" content="anime,animayhem,all,list,anime list,anime slayer,translated,arabic,slayer,أنمي,مترجم,أنمي سلاير,لائحة الأنمي,أنمايهم"/>
                <meta name="description" content="اختر الأنمي ضمن القائمة أو إبحث عن الأنمي"/>
                <meta property="og:title" content="Animayhem - قائمة الأنمي"/>
                <meta property="og:site_name" content="Animayhem"/>
                <meta property="og:url" content="https://animayhem.ga/all" />
                <meta property="og:description" content="اختر الأنمي ضمن القائمة أو إبحث عن الأنمي" />
                <meta property="og:type" content="website" />
            </Head>
            <NavigationWrapper navTrigger="#hamburger-menu" contentId="all" selected="list-all">
                <div id="all-page" className="content-page">
                    <div className="anime-list-header">
                        <h2 className="section-title"><span id="hamburger-menu" className="mdi mdi-menu"></span>قائمة الأنمي</h2>
                        <div className="anime-search-container">
                            { Object.keys(filterOptions).length ? <span id="anime-filter-button" data-tippy-content="التصنيف" className="mdi mdi-filter"></span> : null }
                            <input onInput={ (e: React.ChangeEvent<HTMLInputElement>) => updateSearch(e.target.value) } placeholder="البحث عن الأنمي" type="text" name="anime-search" id="anime-search"/>
                        </div>
                    </div>
                    <ContentList showEpisodeName={ false } className="content-list" contentList={ page == 1 ? results.data : result.data } />
                    <div className="bottom-detector"></div>
                </div>
            </NavigationWrapper>
        </>
    )
}

export default All