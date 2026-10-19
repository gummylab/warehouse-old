import { Spinner } from './ui/spinner'

type Props = {
  text: string
}

export default function LoadingPage({ text }: Props) {
  return (
    // Fixed to the viewport: a loading screen must center itself without
    // depending on ancestor heights (percentage heights collapse when an
    // ancestor's height is auto, and older LINE WebViews lack dvh).
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-y-4 bg-background">
      <Spinner />
      {text}
    </div>
  )
}
