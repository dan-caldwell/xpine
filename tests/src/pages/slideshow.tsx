import ExpandedSlide from "../components/ExpandedSlide"

export const config = {
  componentPaths: [
    {
      route: '/[slide]',
      component: ExpandedSlide,
      ignoreHistoryUpdate: true,
      staticPaths() {
        return [
          {
            slide: 'slide1',
          },
          {
            slide: 'slide2',
          },
          {
            slide: 'slide3',
          },
        ]
      }
    }
  ]
}

export default function Slideshow() {
  return (
    <div class="flex flex-col gap-4">
      <div class="flex">
        <a href="/slideshow/slide1">
          <img src="https://picsum.photos/200?random=1" data-slug="slide1" />
        </a>
      </div>
      <div class="flex">
        <a href="/slideshow/slide2">
          <img src="https://picsum.photos/200?random=2" data-slug="slide2" />
        </a>
      </div>
      <div class="flex">
        <a href="/slideshow/slide3">
          <img src="https://picsum.photos/200?random=3" data-slug="slide3" />
        </a>
      </div>
    </div>
  )
}