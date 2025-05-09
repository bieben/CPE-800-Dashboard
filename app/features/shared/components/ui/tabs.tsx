import * as React from "react";

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, defaultValue, value, onValueChange, ...props }, ref) => {
    const [selectedTab, setSelectedTab] = React.useState(defaultValue || value);

    React.useEffect(() => {
      if (value !== undefined) {
        setSelectedTab(value);
      }
    }, [value]);

    const handleValueChange = (newValue: string) => {
      setSelectedTab(newValue);
      onValueChange?.(newValue);
    };

    return (
      <div
        ref={ref}
        className={className}
        data-selected-tab={selectedTab}
        {...props}
      />
    );
  }
);
Tabs.displayName = "Tabs";

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 ${className || ""}`}
      {...props}
    />
  )
);
TabsList.displayName = "TabsList";

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    const selected = context?.selectedTab === value;

    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 
        ${selected 
          ? "bg-white text-gray-900 shadow-sm" 
          : "text-gray-500 hover:text-gray-900"
        } ${className || ""}`}
        onClick={() => context?.onValueChange?.(value)}
        data-state={selected ? "active" : "inactive"}
        {...props}
      />
    );
  }
);
TabsTrigger.displayName = "TabsTrigger";

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    const selected = context?.selectedTab === value;

    if (!selected) return null;

    return (
      <div
        ref={ref}
        className={`mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 ${className || ""}`}
        {...props}
      />
    );
  }
);
TabsContent.displayName = "TabsContent";

// Create a context to manage tab state
interface TabsContextType {
  selectedTab?: string;
  onValueChange?: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined);

// Add a provider wrapper to the Tabs component
const OriginalTabs = Tabs;
const TabsWithProvider = React.forwardRef<HTMLDivElement, TabsProps>(
  (props, ref) => {
    const [selectedTab, setSelectedTab] = React.useState(props.defaultValue || props.value);

    React.useEffect(() => {
      if (props.value !== undefined) {
        setSelectedTab(props.value);
      }
    }, [props.value]);

    const handleValueChange = (newValue: string) => {
      if (props.value === undefined) {
        setSelectedTab(newValue);
      }
      props.onValueChange?.(newValue);
    };

    return (
      <TabsContext.Provider value={{ selectedTab, onValueChange: handleValueChange }}>
        <OriginalTabs {...props} ref={ref} />
      </TabsContext.Provider>
    );
  }
);
TabsWithProvider.displayName = "Tabs";

// Override the original Tabs component with the provider-wrapped version
const TabsExport = TabsWithProvider as typeof Tabs;

export { TabsExport as Tabs, TabsList, TabsTrigger, TabsContent }; 