import { ChevronRightIcon } from "lucide-react"
import AutoApprovePanel from "./AutoApprovePanel"

interface AutoApproveBarProps {
	style?: React.CSSProperties
}

const AutoApproveBar = ({ style }: AutoApproveBarProps) => {
	return (
		<details className="lumi-inline-disclosure mx-2 border-t border-border/20 group" style={style}>
			<summary className="lumi-details-trigger flex items-center gap-1 py-2 px-2 cursor-pointer list-none text-xs min-w-0">
				<span className="whitespace-nowrap text-muted-foreground shrink-0">Autonomous execution</span>
				<span className="truncate flex-1 text-muted-foreground group-open:text-foreground">On</span>
				<ChevronRightIcon
					aria-hidden
					className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
				/>
			</summary>
			<AutoApprovePanel />
		</details>
	)
}

export default AutoApproveBar
