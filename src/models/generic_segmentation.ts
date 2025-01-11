export class GenericSegmentation {
  constructor(params: any) {
    this.params = params;
  }

  segment(polygon: any) {
    return Promise.resolve(polygon);
  }
}
