import { Spinner } from './ui/spinner'

type Props = {
  text: string
}

export default function LoadingPage({ text }: Props) {
  return (
    // flex-1 stretches the box inside LiffCenter's flex column (viewport
    // minus banner/padding), so justify/items center the spinner and text
    // without percentage heights or dvh units that older LINE WebViews lack.
    <div className="flex flex-1 flex-col items-center justify-center gap-y-4">
      <Spinner />
      {text}
    </div>
  )
}
