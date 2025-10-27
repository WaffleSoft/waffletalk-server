export class SignalRouter<Signal> {
    private sources = new Set<SignalRouter<Signal>>();
    private sinks = new Set<SignalRouter<Signal>>();

    addSource<SourceEvent>(source: SignalRouter<Extract<Signal, SourceEvent>>) {
        this.sources.add(source);
        source.sinks.add(this);
    }

    removeSource<SourceEvent>(source: SignalRouter<Extract<Signal, SourceEvent>>) {
        this.sources.delete(source);
        source.sinks.delete(this);
    }

    destroy() {
        for (const source of this.sources) this.removeSource(source);
        for (const sink of this.sinks) sink.removeSource(this);
        this.sources.clear();
        this.sinks.clear();
    }

    emit(signal: Signal) {
        for (const sink of this.sinks) sink.on(signal);
    }

    on(signal: Signal) {
        this.emit(signal);
    }
}
