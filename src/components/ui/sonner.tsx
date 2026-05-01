import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      gap={8}
      visibleToasts={4}
      offset={16}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toast]:text-emerald-600 dark:group-[.toast]:text-emerald-400",
          error: "group-[.toast]:text-destructive",
          warning: "group-[.toast]:text-amber-600 dark:group-[.toast]:text-amber-400",
          info: "group-[.toast]:text-blue-600 dark:group-[.toast]:text-blue-400",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
