export class EventRouter<Event> {
    constructor(
        private sources: Set<EventRouter<Event>> = new Set(),
        private sinks: Set<EventRouter<Event>> = new Set()
    ) {}

    addSource<SourceEvent>(source: EventRouter<Extract<Event, SourceEvent>>) {
        this.sources.add(source);
        source.sinks.add(this);
    }

    removeSource<SourceEvent>(source: EventRouter<Extract<Event, SourceEvent>>) {
        this.sources.delete(source);
        source.sinks.delete(this);
    }

    destroy() {
        for (const source of this.sources) this.removeSource(source);
        for (const sink of this.sinks) sink.removeSource(this);
        this.sources.clear();
        this.sinks.clear();
    }

    emit(event: Event) {
        for (const sink of this.sinks) sink.emit(event);
    }
}
