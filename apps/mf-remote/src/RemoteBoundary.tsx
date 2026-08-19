import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { name: string; children: ReactNode };
type State = { error: Error | null };

export class RemoteBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`mf-remote: не удалось загрузить ${this.props.name}`, error, info);
  }

  render() {
    const { error } = this.state;

    if (error) {
      return (
        <div className="remote-app__error">
          <strong>{this.props.name} недоступен.</strong>
          <pre>{error.message}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}
