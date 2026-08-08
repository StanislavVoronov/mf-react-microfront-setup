import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { name: string; children: ReactNode };
type State = { error: Error | null };

export class RemoteBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`mf-host: не удалось загрузить ${this.props.name}`, error, info);
  }

  render() {
    const { error } = this.state;

    if (error) {
      return (
        <div className="host__error">
          <strong>{this.props.name} недоступен.</strong>
          <p>
            Подними его dev-сервер: <code>npm run dev</code> в папке{' '}
            {this.props.name}
          </p>
          <pre>{error.message}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}
