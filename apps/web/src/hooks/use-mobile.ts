import * as React from "react"

const MOBILE_BREAKPOINT = 768
const mobileQuery = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
const getMatches = () =>
  typeof window !== "undefined" && window.matchMedia(mobileQuery).matches

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(getMatches)

  React.useEffect(() => {
    const mql = window.matchMedia(mobileQuery)
    const onChange = () => {
      setIsMobile(mql.matches)
    }
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
